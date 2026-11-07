// @ts-nocheck
/**
 * Test Suite for Stage 1: Edge Caching for Read-Only API Endpoints
 * Verifies caching headers, Tier 1 memory hits, stale fallbacks, and isolation.
 */
const assert = require("node:assert");

const isolateMemoryCache = new Map();

function buildNormalizedQueryString(searchParams) {
  const entries = [];
  searchParams.forEach((value, key) => entries.push([key.trim(), value.trim()]));
  if (entries.length === 0) return "";
  entries.sort((a, b) => a[0].localeCompare(b[0]));
  const normalized = new URLSearchParams();
  for (const [key, value] of entries) normalized.append(key, value);
  return normalized.toString();
}

async function simulatedCachedJsonEndpoint({
  request,
  cacheKeyPrefix,
  ttlSeconds = 3600,
  maxStaleAgeSeconds = 86400,
  producer,
  validate,
  errorMessage = "Internal server error",
}) {
  const isAuth =
    request.headers.has("authorization") ||
    request.headers.has("x-user-id");

  if (isAuth) {
    try {
      const authData = await producer();
      return {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
          "X-Cache": "BYPASS-AUTH",
        },
        body: { status: "success", data: authData, message: "OK" },
      };
    } catch (authErr) {
      return {
        status: 500,
        headers: {
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
          "X-Cache": "BYPASS-AUTH-ERROR",
        },
        body: { status: "error", data: null, message: errorMessage },
      };
    }
  }

  const u = new URL(request.url);
  const normalizedQuery = buildNormalizedQueryString(u.searchParams);
  const memoryKey = normalizedQuery ? `${cacheKeyPrefix}:${normalizedQuery}` : cacheKeyPrefix;

  const ttlMs = ttlSeconds * 1000;
  const maxStaleMs = maxStaleAgeSeconds * 1000;
  const now = Date.now();

  // Tier 1 Check
  const memoryEntry = isolateMemoryCache.get(memoryKey);
  if (memoryEntry && now - memoryEntry.timestamp < ttlMs) {
    return {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=60, s-maxage=${ttlSeconds}, stale-while-revalidate=86400`,
        "X-Cache": "HIT-MEMORY",
      },
      body: { status: "success", data: memoryEntry.data, message: "OK" },
    };
  }

  // Tier 3 Producer Execution
  try {
    const data = await producer();

    if (data === null || data === undefined) {
      return {
        status: 404,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "X-Cache": "MISS-404",
        },
        body: { status: "error", data: null, message: "Resource not found" },
      };
    }

    if (validate && !validate(data)) {
      return {
        status: 502,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "X-Cache": "MISS-INVALID",
        },
        body: { status: "error", data: null, message: "Invalid resource data" },
      };
    }

    const generationTime = Date.now();
    isolateMemoryCache.set(memoryKey, {
      data,
      timestamp: generationTime,
    });

    return {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=60, s-maxage=${ttlSeconds}, stale-while-revalidate=86400`,
        "X-Cache": "MISS",
        "X-Edge-Created-At": generationTime.toString(),
      },
      body: { status: "success", data, message: "OK" },
    };
  } catch (producerError) {
    if (memoryEntry) {
      const staleAgeMs = now - memoryEntry.timestamp;
      if (staleAgeMs <= maxStaleMs) {
        return {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "X-Cache": "STALE-FALLBACK",
            "Warning": `110 - "Response is Stale"`,
          },
          body: { status: "success", data: memoryEntry.data, message: "OK (Stale Fallback)" },
        };
      }
    }

    return {
      status: 500,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Cache": "ERROR-NO-CACHE",
      },
      body: { status: "error", data: null, message: errorMessage },
    };
  }
}

// Mock Data
const MOCK_COURSES = [
  { _id: "c1", name: "Calculus for Engineers [MAT1001]" },
  { _id: "c2", name: "Data Structures and Algorithms [CSE2001]" },
];

const MOCK_COUNTS = [
  { name: "Calculus for Engineers [MAT1001]", count: 42 },
  { name: "Data Structures and Algorithms [CSE2001]", count: 85 },
];

const MOCK_UPCOMING = [
  { subject: "Calculus for Engineers [MAT1001]", slots: ["A1", "TA1"] },
];

console.log("============================================================");
console.log("RUNNING STAGE 1 TESTS: Edge Caching for Read-Only Endpoints");
console.log("============================================================\n");

async function runTests() {
  // Test 1: Course List - Miss on first request, 1-hour s-maxage
  console.log("Test 1: GET /api/course-list initial request (MISS, 3600s TTL)...");
  let res1 = await simulatedCachedJsonEndpoint({
    request: new Request("https://pyqvitap.site/api/course-list"),
    cacheKeyPrefix: "api_course_list",
    ttlSeconds: 3600,
    maxStaleAgeSeconds: 604800,
    producer: async () => MOCK_COURSES,
    validate: (data) => Array.isArray(data),
  });
  assert.strictEqual(res1.status, 200);
  assert.strictEqual(res1.headers["X-Cache"], "MISS");
  assert(res1.headers["Cache-Control"].includes("s-maxage=3600"));
  assert(res1.headers["Cache-Control"].includes("stale-while-revalidate=86400"));
  assert.strictEqual(res1.body.data.length, 2);
  console.log("  [PASS] Course list served with MISS and s-maxage=3600");

  // Test 2: Course List - Hit on repeated request
  console.log("Test 2: GET /api/course-list repeated request (HIT-MEMORY)...");
  let res2 = await simulatedCachedJsonEndpoint({
    request: new Request("https://pyqvitap.site/api/course-list"),
    cacheKeyPrefix: "api_course_list",
    ttlSeconds: 3600,
    producer: async () => { throw new Error("Should not be called!"); },
  });
  assert.strictEqual(res2.status, 200);
  assert.strictEqual(res2.headers["X-Cache"], "HIT-MEMORY");
  console.log("  [PASS] Course list served from in-memory cache");

  // Test 3: Papers Count - Miss on first request, 1-hour s-maxage
  console.log("Test 3: GET /api/papers/count initial request (MISS, 3600s TTL)...");
  let res3 = await simulatedCachedJsonEndpoint({
    request: new Request("https://pyqvitap.site/api/papers/count"),
    cacheKeyPrefix: "api_papers_count",
    ttlSeconds: 3600,
    maxStaleAgeSeconds: 604800,
    producer: async () => MOCK_COUNTS,
    validate: (data) => Array.isArray(data),
  });
  assert.strictEqual(res3.status, 200);
  assert.strictEqual(res3.headers["X-Cache"], "MISS");
  assert(res3.headers["Cache-Control"].includes("s-maxage=3600"));
  console.log("  [PASS] Paper counts served with MISS and s-maxage=3600");

  // Test 4: Papers Count - Hit on repeated request
  console.log("Test 4: GET /api/papers/count repeated request (HIT-MEMORY)...");
  let res4 = await simulatedCachedJsonEndpoint({
    request: new Request("https://pyqvitap.site/api/papers/count"),
    cacheKeyPrefix: "api_papers_count",
    ttlSeconds: 3600,
    producer: async () => { throw new Error("Should not be called!"); },
  });
  assert.strictEqual(res4.status, 200);
  assert.strictEqual(res4.headers["X-Cache"], "HIT-MEMORY");
  console.log("  [PASS] Paper counts served from in-memory cache");

  // Test 5: Upcoming Papers - 1800s (30m) TTL
  console.log("Test 5: GET /api/upcoming-papers initial request (MISS, 1800s TTL)...");
  let res5 = await simulatedCachedJsonEndpoint({
    request: new Request("https://pyqvitap.site/api/upcoming-papers"),
    cacheKeyPrefix: "api_upcoming_papers",
    ttlSeconds: 1800,
    maxStaleAgeSeconds: 86400,
    producer: async () => MOCK_UPCOMING,
    validate: (data) => Array.isArray(data),
  });
  assert.strictEqual(res5.status, 200);
  assert.strictEqual(res5.headers["X-Cache"], "MISS");
  assert(res5.headers["Cache-Control"].includes("s-maxage=1800"));
  console.log("  [PASS] Upcoming papers served with MISS and s-maxage=1800");

  // Test 6: Stale Fallback on DB Exception
  console.log("Test 6: Database exception fallback (STALE-FALLBACK)...");
  // Simulate expired entry by manipulating timestamp
  const entry = isolateMemoryCache.get("api_course_list");
  entry.timestamp = Date.now() - 3601 * 1000; // Expired by 1 second, but within 7 days
  let res6 = await simulatedCachedJsonEndpoint({
    request: new Request("https://pyqvitap.site/api/course-list"),
    cacheKeyPrefix: "api_course_list",
    ttlSeconds: 3600,
    maxStaleAgeSeconds: 604800,
    producer: async () => { throw new Error("MongoDB Connection Timed Out!"); },
  });
  assert.strictEqual(res6.status, 200);
  assert.strictEqual(res6.headers["X-Cache"], "STALE-FALLBACK");
  assert.strictEqual(res6.body.data.length, 2);
  console.log("  [PASS] Stale cache served gracefully when database is unavailable");

  // Test 7: Authenticated request bypasses cache
  console.log("Test 7: Authenticated request bypasses cache (BYPASS-AUTH)...");
  let res7 = await simulatedCachedJsonEndpoint({
    request: new Request("https://pyqvitap.site/api/course-list", {
      headers: { "Authorization": "Bearer test-token" },
    }),
    cacheKeyPrefix: "api_course_list",
    ttlSeconds: 3600,
    producer: async () => MOCK_COURSES,
  });
  assert.strictEqual(res7.status, 200);
  assert.strictEqual(res7.headers["X-Cache"], "BYPASS-AUTH");
  console.log("  [PASS] Authenticated request safely bypassed public cache");

  console.log("\n============================================================");
  console.log("ALL 7 STAGE 1 EDGE CACHE TESTS PASSED SUCCESSFULLY!");
  console.log("============================================================\n");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
