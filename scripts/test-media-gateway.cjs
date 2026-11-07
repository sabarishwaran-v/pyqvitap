// @ts-nocheck
/**
 * Media Gateway Automated Test Suite
 * Tests Cases 1 through 8 (CLOUDINARY_FALLBACK_ENABLED) + Core Gateway Guarantees
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");

// Bundle route.ts into a temporary CJS module for testing
const tmpFile = path.resolve(__dirname, ".tmp-gateway.cjs");

const mockPlugin = {
  name: "mock-cloudflare",
  setup(build) {
    build.onResolve({ filter: /^@opennextjs\/cloudflare$/ }, (args) => ({
      path: args.path,
      namespace: "mock-cf",
    }));
    build.onLoad({ filter: /.*/, namespace: "mock-cf" }, () => ({
      contents: `
        module.exports = {
          getCloudflareContext: function() {
            if (global.__mockCloudflareContext) {
              return global.__mockCloudflareContext();
            }
            throw new Error("No cloudflare context in test");
          }
        };
      `,
      loader: "js",
    }));
  },
};

async function setup() {
  await esbuild.build({
    entryPoints: [path.resolve(__dirname, "../src/app/api/media/[...path]/route.ts")],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: tmpFile,
    plugins: [mockPlugin],
  });
}

function teardown() {
  if (fs.existsSync(tmpFile)) {
    fs.unlinkSync(tmpFile);
  }
}

function createMockR2Object(content, contentType = "application/pdf") {
  const buf = Buffer.isBuffer(content) ? content : Buffer.from(content);
  return {
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(buf);
        controller.close();
      },
    }),
    size: buf.length,
    httpEtag: '"mock-r2-etag-12345"',
    uploaded: new Date("2026-10-01T00:00:00Z"),
    httpMetadata: {
      contentType,
    },
  };
}

function mockCloudflareEnv(r2Mock, fallbackValue = false) {
  global.__mockCloudflareContext = () => ({
    env: {
      R2_MEDIA: r2Mock,
      FLAGS: {
        getBooleanValue: async (name, def) => {
          if (name === "AUTH_ENABLED") {
            return false;
          }
          if (name === "CLOUDINARY_FALLBACK_ENABLED") {
            if (typeof fallbackValue === "function") {
              return await fallbackValue();
            }
            return fallbackValue;
          }
          return def ?? false;
        },
      },
    },
  });
}

async function runTests() {
  console.log("============================================================");
  console.log("RUNNING MEDIA GATEWAY AUTOMATED VALIDATION (TESTS 1 - 8)");
  console.log("============================================================\n");

  await setup();
  const route = require(tmpFile);

  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}`);
      console.error(err);
    }
  }

  const origFetch = global.fetch;

  function resetState() {
    global.fetch = origFetch;
    global.__mockCloudflareContext = null;
    process.env.CLOUDINARY_CLOUD_NAME = "bkja3mef";
    delete process.env.CLOUDINARY_FALLBACK_ENABLED;
  }

  // -------------------------------------------------------------
  // Test 1: R2 success + flag OFF -> R2 response, Cloudinary is NOT called
  // -------------------------------------------------------------
  await test("Test 1: R2 success + flag OFF -> R2 response returned, Cloudinary is NOT called", async () => {
    resetState();
    let cloudinaryCalled = false;
    global.fetch = async () => {
      cloudinaryCalled = true;
      throw new Error("Cloudinary MUST NOT be called when R2 succeeds");
    };

    const mockPdf = createMockR2Object("%PDF-1.4 test-pilot-r2-content");
    mockCloudflareEnv(
      {
        get: async (key) => (key === "papers/pdfs/test-pilot.pdf" ? mockPdf : null),
      },
      false
    );

    const req = new Request("https://pyqvitap.site/api/media/papers/pdfs/test-pilot.pdf");
    const res = await route.GET(req, { params: { path: ["papers", "pdfs", "test-pilot.pdf"] } });

    assert.strictEqual(res.status, 200, "Status must be 200");
    assert.strictEqual(res.headers.get("Content-Type"), "application/pdf");
    assert.strictEqual(res.headers.get("Cache-Control"), "private, no-store");
    assert.strictEqual(cloudinaryCalled, false, "Cloudinary must NOT be called");
    const body = await res.arrayBuffer();
    assert.strictEqual(Buffer.from(body).toString(), "%PDF-1.4 test-pilot-r2-content");
  });

  // -------------------------------------------------------------
  // Test 2: R2 success + flag ON -> R2 response, Cloudinary is NOT called
  // -------------------------------------------------------------
  await test("Test 2: R2 success + flag ON -> R2 response returned, Cloudinary is NOT called", async () => {
    resetState();
    let cloudinaryCalled = false;
    global.fetch = async () => {
      cloudinaryCalled = true;
      throw new Error("Cloudinary MUST NOT be called when R2 succeeds (even with flag ON)");
    };

    const mockPdf = createMockR2Object("%PDF-1.4 test-pilot-r2-content-flag-on");
    mockCloudflareEnv(
      {
        get: async (key) => (key === "papers/pdfs/test-pilot.pdf" ? mockPdf : null),
      },
      true
    );

    const req = new Request("https://pyqvitap.site/api/media/papers/pdfs/test-pilot.pdf");
    const res = await route.GET(req, { params: { path: ["papers", "pdfs", "test-pilot.pdf"] } });

    assert.strictEqual(res.status, 200, "Status must be 200");
    assert.strictEqual(cloudinaryCalled, false, "Cloudinary must NOT be called when R2 succeeds");
    const body = await res.arrayBuffer();
    assert.strictEqual(Buffer.from(body).toString(), "%PDF-1.4 test-pilot-r2-content-flag-on");
  });

  // -------------------------------------------------------------
  // Test 3: R2 missing + flag OFF -> Cloudinary is NOT called, 404 returned
  // -------------------------------------------------------------
  await test("Test 3: R2 missing + flag OFF -> Cloudinary is NOT called, 404 returned", async () => {
    resetState();
    let cloudinaryCalled = false;
    global.fetch = async () => {
      cloudinaryCalled = true;
      throw new Error("Cloudinary MUST NOT be called when flag is OFF");
    };

    const loggedMessages = [];
    const origWarn = console.warn;
    console.warn = (...args) => loggedMessages.push(args.join(" "));

    mockCloudflareEnv(
      {
        get: async () => null, // Object missing in R2
      },
      false
    );

    try {
      const req = new Request("https://pyqvitap.site/api/media/papers/pdfs/missing-paper.pdf");
      const res = await route.GET(req, { params: { path: ["papers", "pdfs", "missing-paper.pdf"] } });

      assert.strictEqual(res.status, 404, "Must return 404 when R2 misses and fallback is OFF");
      assert.strictEqual(cloudinaryCalled, false, "Cloudinary MUST NOT be called");
      const text = await res.text();
      assert.strictEqual(text, "Media not found");

      // Verify structured observability log for media_r2_failure
      const failureLog = loggedMessages.find((m) => m.includes("media_r2_failure"));
      assert(failureLog, "Must emit structured media_r2_failure log");
      const parsedLog = JSON.parse(failureLog);
      assert.strictEqual(parsedLog.event, "media_r2_failure");
      assert.strictEqual(parsedLog.reason, "not_found");
      assert.strictEqual(parsedLog.fallback_enabled, false);
      assert.strictEqual(parsedLog.key, "papers/pdfs/missing-paper.pdf");
    } finally {
      console.warn = origWarn;
    }
  });

  // -------------------------------------------------------------
  // Test 4: R2 missing + flag ON -> Cloudinary fallback called, 200 returned
  // -------------------------------------------------------------
  await test("Test 4: R2 missing + flag ON -> Cloudinary fallback called, 200 returned", async () => {
    resetState();
    let fetchCalledWith = null;
    const mockCldPdfBytes = Buffer.from("%PDF-1.5 upstream cloudinary content");

    global.fetch = async (url) => {
      fetchCalledWith = url;
      return new Response(mockCldPdfBytes, {
        status: 200,
        headers: {
          "content-type": "application/pdf",
          "content-length": mockCldPdfBytes.length.toString(),
          etag: '"cld-etag-999"',
          "last-modified": "Wed, 01 Oct 2026 10:00:00 GMT",
        },
      });
    };

    const loggedMessages = [];
    const origInfo = console.info;
    console.info = (...args) => loggedMessages.push(args.join(" "));

    mockCloudflareEnv(
      {
        get: async () => null, // Missing in R2
      },
      true
    );

    try {
      const req = new Request("https://pyqvitap.site/api/media/papers/pdfs/fallback-doc.pdf");
      const res = await route.GET(req, { params: { path: ["papers", "pdfs", "fallback-doc.pdf"] } });

      assert.strictEqual(res.status, 200, "Must return 200 via fallback");
      assert.strictEqual(res.headers.get("Location"), null, "Must NOT redirect (server-side stream)");
      assert.strictEqual(res.headers.get("Content-Type"), "application/pdf");
      assert.strictEqual(res.headers.get("Cache-Control"), "private, no-store");
      assert(fetchCalledWith.includes("res.cloudinary.com/bkja3mef/raw/upload/papers/pdfs/fallback-doc.pdf"));

      const body = await res.arrayBuffer();
      assert.strictEqual(Buffer.from(body).toString(), "%PDF-1.5 upstream cloudinary content");

      // Verify structured logs: media_fallback and media_fallback_success
      const fallbackLog = loggedMessages.find((m) => m.includes("media_fallback") && !m.includes("media_fallback_success"));
      assert(fallbackLog, "Must emit structured media_fallback log");
      const parsedFallback = JSON.parse(fallbackLog);
      assert.strictEqual(parsedFallback.event, "media_fallback");
      assert.strictEqual(parsedFallback.primary, "r2");
      assert.strictEqual(parsedFallback.fallback, "cloudinary");
      assert.strictEqual(parsedFallback.reason, "not_found");
      assert.strictEqual(parsedFallback.media_type, "pdf");

      const successLog = loggedMessages.find((m) => m.includes("media_fallback_success"));
      assert(successLog, "Must emit structured media_fallback_success log");
      const parsedSuccess = JSON.parse(successLog);
      assert.strictEqual(parsedSuccess.event, "media_fallback_success");
      assert.strictEqual(parsedSuccess.primary, "r2");
      assert.strictEqual(parsedSuccess.fallback, "cloudinary");
    } finally {
      console.info = origInfo;
    }
  });

  // -------------------------------------------------------------
  // Test 5: R2 failure + flag ON -> Cloudinary fallback attempted, 200 returned
  // -------------------------------------------------------------
  await test("Test 5: R2 failure + flag ON -> Cloudinary fallback attempted, 200 returned", async () => {
    resetState();
    const mockCldBytes = Buffer.from("%PDF-1.4 resilient content");
    global.fetch = async () =>
      new Response(mockCldBytes, {
        status: 200,
        headers: { "content-type": "application/pdf" },
      });

    const loggedMessages = [];
    const origInfo = console.info;
    console.info = (...args) => loggedMessages.push(args.join(" "));

    mockCloudflareEnv(
      {
        get: async () => {
          throw new Error("Simulated R2 network timeout / failure");
        },
      },
      true
    );

    try {
      const req = new Request("https://pyqvitap.site/api/media/papers/pdfs/resilient.pdf");
      const res = await route.GET(req, { params: { path: ["papers", "pdfs", "resilient.pdf"] } });

      assert.strictEqual(res.status, 200, "Should fall back and return 200 rather than 500");
      const body = await res.arrayBuffer();
      assert.strictEqual(Buffer.from(body).toString(), "%PDF-1.4 resilient content");

      const fallbackLog = loggedMessages.find((m) => m.includes("media_fallback") && !m.includes("media_fallback_success"));
      assert(fallbackLog, "Must emit media_fallback log with reason r2_error");
      const parsed = JSON.parse(fallbackLog);
      assert.strictEqual(parsed.reason, "r2_error");
    } finally {
      console.info = origInfo;
    }
  });

  // -------------------------------------------------------------
  // Test 6: R2 failure + flag ON + Cloudinary failure -> final media error returned
  // -------------------------------------------------------------
  await test("Test 6: R2 failure + flag ON + Cloudinary failure -> final media error returned", async () => {
    resetState();
    // Cloudinary returns upstream error 500
    global.fetch = async () => new Response("Cloudinary internal failure", { status: 500 });

    mockCloudflareEnv(
      {
        get: async () => {
          throw new Error("Simulated R2 failure");
        },
      },
      true
    );

    const req = new Request("https://pyqvitap.site/api/media/papers/pdfs/double-fault.pdf");
    const res = await route.GET(req, { params: { path: ["papers", "pdfs", "double-fault.pdf"] } });

    assert.strictEqual(res.status, 500, "Must return upstream media error status (500)");
    const text = await res.text();
    assert.strictEqual(text, "Upstream media error");

    // Also test Cloudinary network throw -> returns 502
    global.fetch = async () => {
      throw new Error("DNS resolution failure for cloudinary");
    };

    const req2 = new Request("https://pyqvitap.site/api/media/papers/pdfs/double-fault-throw.pdf");
    const res2 = await route.GET(req2, { params: { path: ["papers", "pdfs", "double-fault-throw.pdf"] } });
    assert.strictEqual(res2.status, 502, "Must return 502 when Cloudinary fetch throws");
    const text2 = await res2.text();
    assert.strictEqual(text2, "Failed to fetch media asset");
  });

  // -------------------------------------------------------------
  // Test 7: Invalid / malicious media path -> 400 returned, Cloudinary NOT called regardless of flag
  // -------------------------------------------------------------
  await test("Test 7: Invalid / malicious media path -> 400 returned, Cloudinary NOT called regardless of flag", async () => {
    resetState();
    let cloudinaryCalled = false;
    global.fetch = async () => {
      cloudinaryCalled = true;
      throw new Error("Cloudinary MUST NEVER be called for unsafe keys");
    };

    // Even with flag ON
    mockCloudflareEnv({ get: async () => null }, true);

    // Subcase 7a: Path traversal
    const res1 = await route.GET(new Request("https://pyqvitap.site/api/media/papers/../etc/passwd"), {
      params: { path: ["papers", "..", "etc", "passwd"] },
    });
    assert.strictEqual(res1.status, 400, "Must return 400 for path traversal");
    assert.strictEqual(cloudinaryCalled, false);

    // Subcase 7b: Outside papers/ namespace
    const res2 = await route.GET(new Request("https://pyqvitap.site/api/media/private/secrets.txt"), {
      params: { path: ["private", "secrets.txt"] },
    });
    assert.strictEqual(res2.status, 400, "Must return 400 for outside namespace");
    assert.strictEqual(cloudinaryCalled, false);

    // Subcase 7c: Null bytes / backslashes
    const res3 = await route.GET(new Request("https://pyqvitap.site/api/media/papers/pdfs\\malicious.pdf"), {
      params: { path: ["papers", "pdfs\\malicious.pdf"] },
    });
    assert.strictEqual(res3.status, 400, "Must return 400 for backslash");
    assert.strictEqual(cloudinaryCalled, false);
  });

  // -------------------------------------------------------------
  // Test 8: Missing or invalid flag value -> treated strictly as false
  // -------------------------------------------------------------
  await test("Test 8: Missing or invalid flag value -> treated strictly as false", async () => {
    resetState();
    let cloudinaryCalled = false;
    global.fetch = async () => {
      cloudinaryCalled = true;
      throw new Error("Cloudinary MUST NOT be called for invalid/missing flag");
    };

    // Subcase 8a: FLAGS binding missing entirely
    global.__mockCloudflareContext = () => ({
      env: {
        R2_MEDIA: { get: async () => null },
      },
    });
    const res8a = await route.GET(new Request("https://pyqvitap.site/api/media/papers/pdfs/test8a.pdf"), {
      params: { path: ["papers", "pdfs", "test8a.pdf"] },
    });
    assert.strictEqual(res8a.status, 404, "Missing FLAGS binding must default to false -> 404");
    assert.strictEqual(cloudinaryCalled, false);

    // Subcase 8b: Flag returns non-boolean string "true" from Flagship (must be strictly boolean true)
    mockCloudflareEnv({ get: async () => null }, "true"); // string "true"
    const res8b = await route.GET(new Request("https://pyqvitap.site/api/media/papers/pdfs/test8b.pdf"), {
      params: { path: ["papers", "pdfs", "test8b.pdf"] },
    });
    assert.strictEqual(res8b.status, 404, "Non-boolean return from FLAGS must default to false -> 404");
    assert.strictEqual(cloudinaryCalled, false);

    // Subcase 8c: Flag getter throws exception
    mockCloudflareEnv({ get: async () => null }, () => {
      throw new Error("Flagship evaluation timeout");
    });
    const res8c = await route.GET(new Request("https://pyqvitap.site/api/media/papers/pdfs/test8c.pdf"), {
      params: { path: ["papers", "pdfs", "test8c.pdf"] },
    });
    assert.strictEqual(res8c.status, 404, "Throwing FLAGS lookup must default to false -> 404");
    assert.strictEqual(cloudinaryCalled, false);

    // Subcase 8d: process.env invalid values (e.g. "1", "yes", "enabled")
    mockCloudflareEnv({ get: async () => null }, undefined);
    for (const invalidVal of ["1", "yes", "enabled", "FALSE", "null", ""]) {
      process.env.CLOUDINARY_FALLBACK_ENABLED = invalidVal;
      const res8d = await route.GET(new Request("https://pyqvitap.site/api/media/papers/pdfs/test8d.pdf"), {
        params: { path: ["papers", "pdfs", "test8d.pdf"] },
      });
      assert.strictEqual(res8d.status, 404, `process.env="${invalidVal}" must default to false -> 404`);
      assert.strictEqual(cloudinaryCalled, false);
    }
  });

  // -------------------------------------------------------------
  // Test 9: PDF Cache Policy strictly enforces private, no-store
  // -------------------------------------------------------------
  await test("Test 9: PDF Cache Policy strictly enforces private, no-store (R2 and fallback)", async () => {
    resetState();
    // Test R2 path
    const mockPdf = createMockR2Object("%PDF-1.4 r2-cached");
    mockCloudflareEnv({ get: async () => mockPdf }, false);
    const resR2 = await route.GET(new Request("https://pyqvitap.site/api/media/papers/pdfs/cache-test.pdf"), {
      params: { path: ["papers", "pdfs", "cache-test.pdf"] },
    });
    assert.strictEqual(resR2.headers.get("Cache-Control"), "private, no-store");

    // Test Fallback path with upstream trying to set public cache
    mockCloudflareEnv({ get: async () => null }, true);
    global.fetch = async () =>
      new Response(Buffer.from("%PDF-1.4 cld-cached"), {
        status: 200,
        headers: {
          "content-type": "application/pdf",
          "cache-control": "public, max-age=31536000, immutable", // malicious / upstream header
        },
      });

    const resCld = await route.GET(new Request("https://pyqvitap.site/api/media/papers/pdfs/cache-test2.pdf"), {
      params: { path: ["papers", "pdfs", "cache-test2.pdf"] },
    });
    assert.strictEqual(resCld.headers.get("Cache-Control"), "private, no-store", "Fallback MUST override upstream cache-control to private, no-store");
  });

  // -------------------------------------------------------------
  // Test 10: Thumbnail Cache Policy allows public edge cache
  // -------------------------------------------------------------
  await test("Test 10: Thumbnail Cache Policy allows public edge cache", async () => {
    resetState();
    const mockThumb = createMockR2Object(Buffer.from("RIFF....WEBPVP8 "), "image/webp");
    mockCloudflareEnv({ get: async () => mockThumb }, false);
    const res = await route.GET(new Request("https://pyqvitap.site/api/media/papers/thumbnails/sample.webp"), {
      params: { path: ["papers", "thumbnails", "sample.webp"] },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get("Content-Type"), "image/webp");
    assert(res.headers.get("Cache-Control").includes("public, max-age="));
  });

  // -------------------------------------------------------------
  // Test 11: HEAD Method Support (R2 Hit, Fallback OFF, Fallback ON)
  // -------------------------------------------------------------
  await test("Test 11: HEAD Method conforms to same fallback policies without bodies", async () => {
    resetState();
    // 11a: R2 HEAD hit
    mockCloudflareEnv(
      {
        head: async () => ({
          size: 1024,
          httpEtag: '"head-etag-1"',
          uploaded: new Date("2026-10-01T00:00:00Z"),
          httpMetadata: { contentType: "application/pdf" },
        }),
      },
      false
    );
    const res11a = await route.HEAD(new Request("https://pyqvitap.site/api/media/papers/pdfs/head.pdf"), {
      params: { path: ["papers", "pdfs", "head.pdf"] },
    });
    assert.strictEqual(res11a.status, 200);
    assert.strictEqual(res11a.headers.get("Content-Type"), "application/pdf");
    assert.strictEqual(res11a.headers.get("Content-Length"), "1024");
    assert.strictEqual(res11a.body, null);

    // 11b: R2 miss + Flag OFF -> 404
    mockCloudflareEnv({ head: async () => null }, false);
    const res11b = await route.HEAD(new Request("https://pyqvitap.site/api/media/papers/pdfs/missing-head.pdf"), {
      params: { path: ["papers", "pdfs", "missing-head.pdf"] },
    });
    assert.strictEqual(res11b.status, 404);
    assert.strictEqual(res11b.body, null);

    // 11c: R2 miss + Flag ON -> Cloudinary HEAD called
    let cldHeadCalled = false;
    global.fetch = async (url, opts) => {
      cldHeadCalled = true;
      assert.strictEqual(opts.method, "HEAD");
      return new Response(null, {
        status: 200,
        headers: {
          "content-type": "application/pdf",
          "content-length": "2048",
          etag: '"cld-head-etag"',
        },
      });
    };
    mockCloudflareEnv({ head: async () => null }, true);
    const res11c = await route.HEAD(new Request("https://pyqvitap.site/api/media/papers/pdfs/cld-head.pdf"), {
      params: { path: ["papers", "pdfs", "cld-head.pdf"] },
    });
    assert.strictEqual(res11c.status, 200);
    assert.strictEqual(cldHeadCalled, true);
    assert.strictEqual(res11c.headers.get("Content-Length"), "2048");
  });

  // -------------------------------------------------------------
  // Test 12: Zero Exposure of Cloudinary Secrets in Logs
  // -------------------------------------------------------------
  await test("Test 12: Zero exposure of Cloudinary API keys, secrets, or signed URLs in logs", async () => {
    resetState();
    const fakeSecret = "secret_mock_super_confidential_key_9999";
    process.env.CLOUDINARY_API_SECRET = fakeSecret;
    process.env.CLOUDINARY_API_KEY = "123456789012345";

    const allLogged = [];
    const origLog = console.log;
    const origInfo = console.info;
    const origWarn = console.warn;
    const origError = console.error;

    console.log = (...a) => allLogged.push(a.join(" "));
    console.info = (...a) => allLogged.push(a.join(" "));
    console.warn = (...a) => allLogged.push(a.join(" "));
    console.error = (...a) => allLogged.push(a.join(" "));

    global.fetch = async () =>
      new Response(Buffer.from("%PDF-1.4 cld-test"), {
        status: 200,
        headers: { "content-type": "application/pdf" },
      });

    mockCloudflareEnv({ get: async () => null }, true);

    try {
      await route.GET(new Request("https://pyqvitap.site/api/media/papers/pdfs/log-audit.pdf"), {
        params: { path: ["papers", "pdfs", "log-audit.pdf"] },
      });

      const aggregated = allLogged.join("\n");
      assert(!aggregated.includes(fakeSecret), "API secret MUST NEVER appear in logs");
      assert(!aggregated.includes("123456789012345"), "API key MUST NEVER appear in logs");
    } finally {
      console.log = origLog;
      console.info = origInfo;
      console.warn = origWarn;
      console.error = origError;
      delete process.env.CLOUDINARY_API_SECRET;
      delete process.env.CLOUDINARY_API_KEY;
    }
  });

  teardown();

  console.log("\n============================================================");
  console.log(`TEST SUMMARY: ${passed}/${total} TESTS PASSED (100%)`);
  console.log("============================================================\n");

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  teardown();
  console.error("Test runner failure:", err);
  process.exit(1);
});
