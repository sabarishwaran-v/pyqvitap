// @ts-nocheck
/**
 * PyqVitAp Phase 7B CPU Smoke Test & Telemetry Correlator
 * Untracked test runner for Phase 7B execution.
 */
const https = require("node:https");
const fs = require("node:fs");
const path = require("node:path");

const CANDIDATE_VERSION_ID = "d6d7b1bb-e70d-4099-a54a-30b111a39f97";
const BASE_URL = "https://pyqvitap.site";
const TAIL_FILE = path.join(__dirname, "phase7b_tail_raw.jsonl");
const OUTPUT_FILE = path.join(__dirname, "phase7b-test-results.json");

const TEST_MATRIX = [
  {
    id: "C1",
    name: "Health Baseline",
    path: "/api/health",
    expectedStatus: 200,
    description: "Pure isolate baseline; zero DB queries; returns static JSON",
  },
  {
    id: "C2",
    name: "SSR Paper Detail (Primary Fix Measurement)",
    path: "/paper/6aa2e4bcb94edf2397e2376c",
    expectedStatus: 200,
    description: "Server-side render of paper detail with client PDF wrapper bypass; 1 MongoDB read; 0 R2 reads during SSR",
  },
  {
    id: "C3",
    name: "Course List API (Edge-Cached)",
    path: "/api/course-list",
    expectedStatus: 200,
    description: "Cached JSON endpoint test; checks isolate memory & Cache API; 0-1 MongoDB read",
  },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sendRequest(testItem) {
  return new Promise((resolve) => {
    const fullUrl = new URL(testItem.path, BASE_URL);
    const startTime = Date.now();

    const req = https.request(
      fullUrl,
      {
        method: "GET",
        headers: {
          "User-Agent": "PyqVitAp-Phase7B-Runner",
          "Accept": "*/*",
          "Cloudflare-Workers-Version-Overrides": `pyqvitap-migration-test="${CANDIDATE_VERSION_ID}"`,
          "X-Pyq-Test-Id": testItem.id,
        },
        timeout: 15000,
      },
      (res) => {
        const rawRay = res.headers["cf-ray"] || null;
        let bareRay = null;
        let colo = null;
        if (rawRay) {
          const parts = rawRay.split("-");
          bareRay = parts[0].trim().toLowerCase();
          colo = parts.length > 1 ? parts[1].trim() : null;
        }

        res.on("data", () => {});
        res.on("end", () => {
          const clientDurationMs = Date.now() - startTime;
          resolve({
            id: testItem.id,
            name: testItem.name,
            path: testItem.path,
            status: res.statusCode,
            rawRay,
            bareRay,
            colo,
            xCache: res.headers["x-cache"] || null,
            contentType: res.headers["content-type"] || null,
            clientDurationMs,
            error: null,
          });
        });
      }
    );

    req.on("error", (err) => {
      resolve({
        id: testItem.id,
        name: testItem.name,
        path: testItem.path,
        status: null,
        rawRay: null,
        bareRay: null,
        colo: null,
        xCache: null,
        contentType: null,
        clientDurationMs: Date.now() - startTime,
        error: err.message,
      });
    });

    req.on("timeout", () => {
      req.destroy(new Error("Request timed out after 15s"));
    });

    req.end();
  });
}

function parseTailEvents(filePath, candidateVersionId) {
  if (!fs.existsSync(filePath)) {
    console.warn(`Tail file does not exist: ${filePath}`);
    return [];
  }
  const raw = fs.readFileSync(filePath, "utf8");
  const events = [];
  let depth = 0;
  let startIdx = -1;
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (ch === "\\") {
      escapeNext = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === "{") {
      if (depth === 0) startIdx = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && startIdx !== -1) {
        const jsonStr = raw.substring(startIdx, i + 1);
        try {
          const parsed = JSON.parse(jsonStr);
          // Only capture candidate version events
          if (parsed.scriptVersion && parsed.scriptVersion.id === candidateVersionId) {
            events.push(parsed);
          }
        } catch (e) {
          // ignore malformed fragment
        }
        startIdx = -1;
      }
    }
  }

  return events;
}

async function run() {
  console.log("===============================================================");
  console.log("PYQVITAP PHASE 7B CPU SMOKE TEST EXECUTION");
  console.log("Base URL:", BASE_URL);
  console.log("Candidate Version ID:", CANDIDATE_VERSION_ID);
  console.log("Tail File:", TAIL_FILE);
  console.log("===============================================================\n");

  const results = [];
  let stopTriggered = false;
  let stopReason = "";

  for (let i = 0; i < TEST_MATRIX.length; i++) {
    const testItem = TEST_MATRIX[i];
    console.log(`[${i + 1}/${TEST_MATRIX.length}] Sending ${testItem.id}: ${testItem.name} (${testItem.path})`);

    const res = await sendRequest(testItem);
    results.push(res);

    console.log(`  -> HTTP Status: ${res.status} | Ray ID: ${res.rawRay || "NONE"} | X-Cache: ${res.xCache || "N/A"} | Client RTT: ${res.clientDurationMs}ms`);

    if (res.status !== testItem.expectedStatus) {
      stopTriggered = true;
      stopReason = `Unexpected status ${res.status} on ${testItem.id} (expected ${testItem.expectedStatus})`;
      console.error(`  [STOP TRIGGERED] ${stopReason}`);
      break;
    }

    if (res.status === 1102) {
      stopTriggered = true;
      stopReason = `Error 1102 (exceededCpu) detected on ${testItem.id}`;
      console.error(`  [STOP TRIGGERED] ${stopReason}`);
      break;
    }

    if (i < TEST_MATRIX.length - 1) {
      console.log("  Waiting 2.0s before next request...");
      await sleep(2000);
    }
  }

  console.log("\nWaiting 6.0 seconds for edge tail stream to flush events...");
  await sleep(6000);

  // Parse telemetry events
  console.log("Parsing telemetry events from:", TAIL_FILE);
  const tailEvents = parseTailEvents(TAIL_FILE, CANDIDATE_VERSION_ID);
  console.log(`Found ${tailEvents.length} candidate version (${CANDIDATE_VERSION_ID}) events in tail log.`);

  // Correlation map by bare Ray ID
  const rayMap = new Map();
  const duplicateRays = new Set();
  for (const ev of tailEvents) {
    const rawTailRay = ev.event?.request?.headers?.["cf-ray"] || ev.event?.request?.headers?.["cf_ray"] || "";
    const bareTailRay = rawTailRay.split("-")[0].trim().toLowerCase();
    if (bareTailRay) {
      if (rayMap.has(bareTailRay)) {
        duplicateRays.add(bareTailRay);
      } else {
        rayMap.set(bareTailRay, ev);
      }
    }
  }

  if (duplicateRays.size > 0) {
    console.warn(`[WARNING] Detected ${duplicateRays.size} duplicate Ray IDs in telemetry stream:`, Array.from(duplicateRays));
  }

  const finalReport = [];
  let exceededCpuCount = 0;
  let exceededMemoryCount = 0;
  let totalExceptions = 0;
  let missingTelemetryCount = 0;

  for (const r of results) {
    let matchedEv = null;
    if (r.bareRay) {
      matchedEv = rayMap.get(r.bareRay);
    }

    const item = {
      testId: r.id,
      name: r.name,
      path: r.path,
      httpStatus: r.status,
      rawRay: r.rawRay,
      bareRay: r.bareRay,
      colo: r.colo,
      xCache: r.xCache,
      clientDurationMs: r.clientDurationMs,
      matchedTelemetry: Boolean(matchedEv),
      outcome: matchedEv ? matchedEv.outcome || "unknown" : "TELEMETRY_MISSING",
      scriptVersionId: matchedEv?.scriptVersion?.id || null,
      rawCpuMicroseconds: matchedEv && typeof matchedEv.cpuTime === "number" ? matchedEv.cpuTime : null,
      cpuMs: matchedEv && typeof matchedEv.cpuTime === "number" ? (matchedEv.cpuTime / 1000).toFixed(3) : null,
      rawWallMicroseconds: matchedEv && typeof matchedEv.wallTime === "number" ? matchedEv.wallTime : null,
      wallMs: matchedEv && typeof matchedEv.wallTime === "number" ? (matchedEv.wallTime / 1000).toFixed(3) : null,
      exceptions: matchedEv?.exceptions || [],
    };

    if (item.outcome === "TELEMETRY_MISSING") missingTelemetryCount++;
    if (item.outcome === "exceededCpu") exceededCpuCount++;
    if (item.outcome === "exceededMemory") exceededMemoryCount++;
    if (item.exceptions && item.exceptions.length > 0) totalExceptions += item.exceptions.length;

    finalReport.push(item);
  }

  const summary = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    candidateVersionId: CANDIDATE_VERSION_ID,
    stopTriggered,
    stopReason: stopReason || null,
    totalTestsExecuted: results.length,
    testsPassed: finalReport.filter((t) => t.httpStatus === 200).length,
    missingTelemetryCount,
    exceededCpuCount,
    exceededMemoryCount,
    totalExceptions,
    telemetryEventsCaptured: tailEvents.length,
    report: finalReport,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(summary, null, 2));
  console.log(`\nWrote complete report to: ${OUTPUT_FILE}`);

  console.log("\n===============================================================");
  console.log("PHASE 7B TELEMETRY CORRELATION SUMMARY");
  console.log("===============================================================");
  console.table(
    finalReport.map((f) => ({
      Test: f.testId,
      Path: f.path.length > 35 ? f.path.slice(0, 32) + "..." : f.path,
      HTTP: f.httpStatus,
      RayID: f.rawRay ? f.rawRay.slice(0, 16) + "..." : "NONE",
      Outcome: f.outcome,
      "CPU (ms)": f.cpuMs ? `${f.cpuMs} ms` : "N/A",
      "Wall (ms)": f.wallMs ? `${f.wallMs} ms` : "N/A",
      ClientRTT: `${f.clientDurationMs} ms`,
      Cache: f.xCache || "-",
    }))
  );

  if (stopTriggered) {
    console.error(`\n[FAIL] Phase 7B stopped prematurely: ${stopReason}`);
    process.exit(1);
  } else if (missingTelemetryCount > 0) {
    console.warn(`\n[INCONCLUSIVE] Missing telemetry for ${missingTelemetryCount} request(s).`);
  } else if (exceededCpuCount > 0 || exceededMemoryCount > 0) {
    console.error(`\n[FAIL] Resource limit exceeded (exceededCpu: ${exceededCpuCount}, exceededMemory: ${exceededMemoryCount})`);
    process.exit(1);
  } else {
    console.log("\n[SUCCESS] Phase 7B CPU smoke test completed with zero resource limit errors.");
  }
}

run().catch((e) => {
  console.error("Fatal test runner error:", e);
  process.exit(1);
});
