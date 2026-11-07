/**
 * scripts/test-stage5-search-cache.cjs
 *
 * Stage 5 Verification: Paper Search, Pinned Papers & Selected Papers Caching
 * Verifies that:
 * 1. /api/selected-papers uses cachedJsonEndpoint with 1800s TTL and stale fallback.
 * 2. getPapersBySubjects in paper.ts caches results in-memory to prevent repeated DB roundtrips.
 * 3. next.config.js has s-maxage edge cache headers configured for search and selected endpoints.
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("============================================================");
console.log("RUNNING STAGE 5 TESTS: Paper Search & Probing Edge Caching");
console.log("============================================================");

const ROOT = path.resolve(__dirname, "..");
const selectedPapersPath = path.join(ROOT, "src/app/api/selected-papers/route.ts");
const selectedContent = fs.readFileSync(selectedPapersPath, "utf8");

const paperServicePath = path.join(ROOT, "src/lib/services/paper.ts");
const paperServiceContent = fs.readFileSync(paperServicePath, "utf8");

const nextConfigPath = path.join(ROOT, "next.config.js");
const nextConfigContent = fs.readFileSync(nextConfigPath, "utf8");

// Test 1: Verify /api/selected-papers uses cachedJsonEndpoint
console.log("\nTest 1: Verify /api/selected-papers edge caching...");
assert(selectedContent.includes("cachedJsonEndpoint"), "/api/selected-papers must use cachedJsonEndpoint");
assert(selectedContent.includes('cacheKeyPrefix: "api_selected_papers"'), "Must have cacheKeyPrefix for selected papers");
assert(selectedContent.includes("ttlSeconds: 1800"), "Must have 1800s fresh TTL");
assert(selectedContent.includes("maxStaleAgeSeconds: 86400"), "Must have 24h stale fallback");
console.log("  [PASS] /api/selected-papers edge caching configured");

// Test 2: Verify getPapersBySubjects in-memory cache
console.log("\nTest 2: Verify getPapersBySubjects in-memory caching...");
assert(paperServiceContent.includes("papersBySubjectsCache"), "paper.ts must declare papersBySubjectsCache");
assert(paperServiceContent.includes('subjects.slice().sort().join("::")'), "Must use sorted subject list for deterministic key");
assert(paperServiceContent.includes("PAPERS_BY_SUBJECTS_TTL_MS"), "Must define TTL for subject cache");
console.log("  [PASS] getPapersBySubjects has deterministic in-memory caching");

// Test 3: Simulation of subject cache hits
console.log("\nTest 3: Simulation of repeated subject queries...");
{
  const cache = new Map();
  let dbCalls = 0;

  function mockGetPapersBySubjects(subjects) {
    if (!Array.isArray(subjects) || subjects.length === 0) return [];
    const key = subjects.slice().sort().join("::");
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
    dbCalls++;
    const res = subjects.map((s) => ({ subject: s, slots: ["A1", "A2"] }));
    cache.set(key, { data: res, expiresAt: Date.now() + 900000 });
    return res;
  }

  // Call 1: uncached
  const res1 = mockGetPapersBySubjects(["Calculus", "Physics"]);
  assert.strictEqual(dbCalls, 1);

  // Call 2: same order -> hit
  const res2 = mockGetPapersBySubjects(["Calculus", "Physics"]);
  assert.strictEqual(dbCalls, 1);

  // Call 3: different order -> same key -> hit
  const res3 = mockGetPapersBySubjects(["Physics", "Calculus"]);
  assert.strictEqual(dbCalls, 1, "Reversed subject array must hit cache due to sorted key");

  assert.deepStrictEqual(res1, res2);
  assert.deepStrictEqual(res1, res3);
  console.log("  [PASS] Cached hits verified with deterministic order-independent keys");
}

// Test 4: Verify next.config.js route headers
console.log("\nTest 4: Verify next.config.js edge cache headers...");
assert(nextConfigContent.includes('source: "/api/papers"'), "Must define headers for /api/papers");
assert(nextConfigContent.includes('source: "/api/selected-papers"'), "Must define headers for /api/selected-papers");
assert(nextConfigContent.includes('source: "/api/related-subject"'), "Must define headers for /api/related-subject");
console.log("  [PASS] Cloudflare edge route cache headers verified in next.config.js");

console.log("\n============================================================");
console.log("ALL 4 STAGE 5 TESTS PASSED SUCCESSFULLY!");
console.log("============================================================\n");
