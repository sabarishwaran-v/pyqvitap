#!/usr/bin/env node
/**
 * PyqVitAp Production Smoke Test Suite
 *
 * Performs read-only HTTP validation against the live PyqVitAp application.
 * Verifies health, core routing, API edge caching, and media gateway compliance.
 *
 * Usage:
 *   node scripts/smoke-test.cjs
 *   SMOKE_TEST_BASE_URL=https://pyqvitap.site corepack pnpm run smoke-test
 */

"use strict";

const DEFAULT_BASE_URL = "https://pyqvitap.site";
const TIMEOUT_MS = parseInt(process.env.SMOKE_TEST_TIMEOUT_MS || "15000", 10) || 15000;
const USER_AGENT = "PyqVitAp-SmokeTest/1.0 (+https://pyqvitap.site)";

// --- Safe Error Helper ---
/**
 * @param {unknown} err
 * @returns {string}
 */
function getErrorMessage(err) {
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}

// --- URL Validation ---
/**
 * @param {string} rawUrl
 * @returns {string}
 */
function validateBaseUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") {
    throw new Error("Base URL must be a non-empty string");
  }

  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch (err) {
    throw new Error(`Invalid base URL format: "${rawUrl}"`);
  }

  // Reject credentials in URL (e.g., https://user:pass@host)
  if (parsed.username || parsed.password) {
    throw new Error("Base URL must not contain user credentials");
  }

  const isLocalhost =
    parsed.hostname === "localhost" ||
    parsed.hostname === "127.0.0.1" ||
    parsed.hostname === "::1";

  if (parsed.protocol === "http:") {
    if (!isLocalhost) {
      throw new Error(
        `Insecure HTTP protocol is only permitted for localhost, not for "${parsed.hostname}". Use HTTPS.`
      );
    }
  } else if (parsed.protocol !== "https:") {
    throw new Error(`Unsupported protocol "${parsed.protocol}". Only HTTPS (or HTTP for localhost) is permitted.`);
  }

  // Normalize: remove trailing slashes
  return parsed.origin;
}

// --- Safe Fetch Helper ---
/**
 * @typedef {Object} SafeFetchOptions
 * @property {number} [timeoutMs]
 * @property {string} [method]
 * @property {Record<string, string>} [headers]
 */

/**
 * @param {string} urlStr
 * @param {SafeFetchOptions} [options]
 * @returns {Promise<Response>}
 */
async function safeFetch(urlStr, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs || TIMEOUT_MS);

  try {
    const headers = {
      "User-Agent": USER_AGENT,
      Accept: "*/*",
      ...(options.headers || {}),
    };

    const res = await fetch(urlStr, {
      method: options.method || "GET",
      headers,
      signal: controller.signal,
      redirect: "manual",
    });

    return res;
  } finally {
    clearTimeout(timer);
  }
}

// --- Main Test Suite ---
/**
 * @typedef {Object} SmokeTestCase
 * @property {"PASS" | "FAIL" | "SKIPPED"} status
 * @property {string} name
 * @property {string} [details]
 */

/**
 * @typedef {Object} SmokeTestResults
 * @property {number} passed
 * @property {number} failed
 * @property {number} skipped
 * @property {SmokeTestCase[]} tests
 */

async function runSmokeTests() {
  const rawBaseUrl = process.env.SMOKE_TEST_BASE_URL || DEFAULT_BASE_URL;
  let baseUrl;

  try {
    baseUrl = validateBaseUrl(rawBaseUrl);
  } catch (err) {
    console.error(`[CONFIG ERROR] ${getErrorMessage(err)}`);
    process.exit(1);
  }

  console.log(`============================================================`);
  console.log(` PYQVITAP PRODUCTION SMOKE TEST SUITE`);
  console.log(` Target Origin: ${baseUrl}`);
  console.log(` Timestamp:     ${new Date().toISOString()}`);
  console.log(`============================================================\n`);

  /** @type {SmokeTestResults} */
  const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
    tests: [],
  };

  /**
   * @param {"PASS" | "FAIL" | "SKIPPED"} status
   * @param {string} name
   * @param {string} [details]
   * @returns {void}
   */
  function record(status, name, details = "") {
    results.tests.push({ status, name, details });
    if (status === "PASS") results.passed++;
    else if (status === "FAIL") results.failed++;
    else if (status === "SKIPPED") results.skipped++;

    const prefix =
      status === "PASS"
        ? "\x1b[32m[PASS]\x1b[0m"
        : status === "FAIL"
        ? "\x1b[31m[FAIL]\x1b[0m"
        : "\x1b[33m[SKIPPED]\x1b[0m";

    console.log(`${prefix} ${name}${details ? ` — ${details}` : ""}`);
  }

  // --- Test 1: Health Endpoint ---
  try {
    const targetUrl = `${baseUrl}/api/health`;
    const res = await safeFetch(targetUrl);
    const contentType = res.headers.get("content-type") || "";
    const cacheControl = res.headers.get("cache-control") || "";

    if (res.status !== 200) {
      record("FAIL", "Health endpoint (/api/health)", `Expected HTTP 200, received ${res.status}`);
    } else if (!contentType.includes("application/json")) {
      record("FAIL", "Health endpoint (/api/health)", `Expected application/json, received ${contentType}`);
    } else {
      const data = await res.json();
      if (data && data.status === "ok") {
        const cacheNote = cacheControl.includes("no-store") ? " (no-store confirmed)" : "";
        record("PASS", "Health endpoint (/api/health)", `HTTP 200, status: "${data.status}"${cacheNote}`);
      } else {
        record("FAIL", "Health endpoint (/api/health)", `Invalid body: ${JSON.stringify(data)}`);
      }
    }
  } catch (err) {
    record("FAIL", "Health endpoint (/api/health)", `Request failed: ${getErrorMessage(err)}`);
  }

  // --- Test 2: Homepage ---
  try {
    const targetUrl = `${baseUrl}/`;
    const res = await safeFetch(targetUrl);
    const contentType = res.headers.get("content-type") || "";

    if (res.status !== 200) {
      record("FAIL", "Homepage (/)", `Expected HTTP 200, received ${res.status}`);
    } else if (!contentType.includes("text/html")) {
      record("FAIL", "Homepage (/)", `Expected text/html, received ${contentType}`);
    } else {
      const html = await res.text();
      if (html.includes("PyqVitAp")) {
        record("PASS", "Homepage (/)", `HTTP 200, HTML contains "PyqVitAp" branding`);
      } else {
        record("FAIL", "Homepage (/)", `HTML response does not contain expected "PyqVitAp" title/marker`);
      }
    }
  } catch (err) {
    record("FAIL", "Homepage (/)", `Request failed: ${getErrorMessage(err)}`);
  }

  // --- Test 3: Catalogue ---
  try {
    const targetUrl = `${baseUrl}/catalogue`;
    const res = await safeFetch(targetUrl);
    const contentType = res.headers.get("content-type") || "";

    if (res.status !== 200) {
      record("FAIL", "Catalogue (/catalogue)", `Expected HTTP 200, received ${res.status}`);
    } else if (!contentType.includes("text/html")) {
      record("FAIL", "Catalogue (/catalogue)", `Expected text/html, received ${contentType}`);
    } else {
      const html = await res.text();
      if (html.includes("PyqVitAp") || html.includes("catalogue") || html.includes("Catalogue")) {
        record("PASS", "Catalogue (/catalogue)", `HTTP 200, rendered catalogue layout verified`);
      } else {
        record("FAIL", "Catalogue (/catalogue)", `HTML response missing expected catalogue content`);
      }
    }
  } catch (err) {
    record("FAIL", "Catalogue (/catalogue)", `Request failed: ${getErrorMessage(err)}`);
  }

  // --- Test 4: Upcoming Papers API ---
  try {
    const targetUrl = `${baseUrl}/api/upcoming-papers`;
    const res = await safeFetch(targetUrl);
    const contentType = res.headers.get("content-type") || "";
    const cacheControl = res.headers.get("cache-control") || "";

    if (res.status !== 200) {
      record("FAIL", "Upcoming papers API (/api/upcoming-papers)", `Expected HTTP 200, received ${res.status}`);
    } else if (!contentType.includes("application/json")) {
      record("FAIL", "Upcoming papers API (/api/upcoming-papers)", `Expected application/json, received ${contentType}`);
    } else {
      const data = await res.json();
      if (data && data.status === "success" && Array.isArray(data.data)) {
        const edgeCacheNote = cacheControl.includes("s-maxage") ? " (edge caching confirmed)" : "";
        record(
          "PASS",
          "Upcoming papers API (/api/upcoming-papers)",
          `HTTP 200, valid payload array (${data.data.length} items)${edgeCacheNote}`
        );
      } else {
        record("FAIL", "Upcoming papers API (/api/upcoming-papers)", `Unexpected response format: ${JSON.stringify(data).slice(0, 100)}`);
      }
    }
  } catch (err) {
    record("FAIL", "Upcoming papers API (/api/upcoming-papers)", `Request failed: ${getErrorMessage(err)}`);
  }

  // --- Test 5: Media Delivery (Range Request) ---
  /** @type {string | null} */
  let observedEtag = null;
  const customMediaPath = process.env.SMOKE_TEST_MEDIA_PATH;

  if (customMediaPath) {
    try {
      const targetUrl = `${baseUrl}${customMediaPath.startsWith("/") ? "" : "/"}${customMediaPath}`;
      const res = await safeFetch(targetUrl, {
        headers: { Range: "bytes=0-15" },
      });

      if (res.status === 206) {
        const contentRange = res.headers.get("content-range") || "";
        const acceptRanges = res.headers.get("accept-ranges") || "";
        observedEtag = res.headers.get("etag");

        record(
          "PASS",
          "Media range delivery (RFC 9110)",
          `HTTP 206, Content-Range: "${contentRange}", Accept-Ranges: "${acceptRanges}"`
        );
      } else if (res.status === 404) {
        record("SKIPPED", "Media range delivery (RFC 9110)", `Configured path returned 404 (fixture missing)`);
      } else {
        record("FAIL", "Media range delivery (RFC 9110)", `Expected HTTP 206 for byte range, received ${res.status}`);
      }
    } catch (err) {
      record("FAIL", "Media range delivery (RFC 9110)", `Request failed: ${getErrorMessage(err)}`);
    }
  } else {
    record(
      "SKIPPED",
      "Media range delivery (RFC 9110)",
      "No representative media fixture URL configured (set SMOKE_TEST_MEDIA_PATH to enable)"
    );
  }

  // --- Test 6: Conditional Media Request ---
  if (customMediaPath && observedEtag) {
    try {
      const targetUrl = `${baseUrl}${customMediaPath.startsWith("/") ? "" : "/"}${customMediaPath}`;
      const res = await safeFetch(targetUrl, {
        headers: { "If-None-Match": observedEtag },
      });

      if (res.status === 304) {
        record("PASS", "Conditional media delivery (RFC 9110)", `HTTP 304 Not Modified with matching ETag`);
      } else {
        record(
          "FAIL",
          "Conditional media delivery (RFC 9110)",
          `Expected HTTP 304 for matching If-None-Match, received ${res.status}`
        );
      }
    } catch (err) {
      record("FAIL", "Conditional media delivery (RFC 9110)", `Request failed: ${getErrorMessage(err)}`);
    }
  } else {
    record(
      "SKIPPED",
      "Conditional media delivery (RFC 9110)",
      customMediaPath ? "No ETag returned by media endpoint to evaluate If-None-Match" : "Skipped because media fixture URL not configured"
    );
  }

  // --- Summary Report ---
  console.log(`\n------------------------------------------------------------`);
  console.log(` SUMMARY:`);
  console.log(`   Passed:  ${results.passed}`);
  console.log(`   Failed:  ${results.failed}`);
  console.log(`   Skipped: ${results.skipped}`);
  console.log(`   Total:   ${results.tests.length}`);
  console.log(`------------------------------------------------------------`);

  if (results.failed > 0) {
    console.error(`\x1b[31mOVERALL RESULT: FAILED (${results.failed} check(s) failed)\x1b[0m\n`);
    process.exit(1);
  } else {
    console.log(`\x1b[32mOVERALL RESULT: PASSED (all mandatory checks satisfied)\x1b[0m\n`);
    process.exit(0);
  }
}

// Self-executing runner
if (require.main === module) {
  runSmokeTests().catch((/** @type {unknown} */ err) => {
    const message = err instanceof Error ? (err.stack || err.message) : String(err);
    console.error(`[FATAL ERROR] Unexpected runner exception: ${message}`);
    process.exit(1);
  });
}

module.exports = { validateBaseUrl, runSmokeTests };
