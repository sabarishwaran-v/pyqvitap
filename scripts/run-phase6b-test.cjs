// @ts-nocheck
/**
 * PyqVitAp Phase 6B Bounded Edge Test & Telemetry Correlator
 * Strictly untracked script for Phase 6B execution.
 */
const https = require("node:https");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const TEST_MATRIX = [
  { id: "T1", name: "Health Check (Baseline)", path: "/api/health", expectedStatus: [200] },
  { id: "T2", name: "Cold SSR Paper Detail", path: "/paper/6aa2e4bcb94edf2397e2376c", expectedStatus: [200] },
  { id: "T3", name: "Warm SSR Paper Detail", path: "/paper/6aa2e4bcb94edf2397e2376c", expectedStatus: [200] },
  { id: "T4", name: "Cold Course List API", path: "/api/course-list", expectedStatus: [200] },
  { id: "T5", name: "Warm Course List API", path: "/api/course-list", expectedStatus: [200] },
  { id: "T6", name: "Cold Papers Search API", path: "/api/papers?subject=CHEMISTRY%20AND%20ENVIRONMENTAL%20STUDIES%20[CHY1009]", expectedStatus: [200] },
  { id: "T7", name: "Warm Papers Search API", path: "/api/papers?subject=CHEMISTRY%20AND%20ENVIRONMENTAL%20STUDIES%20[CHY1009]", expectedStatus: [200] },
  { id: "T8", name: "PDF Media Streaming", path: "/api/media/papers/pdfs/CHY1009_2025_FAT_A1_Set_6_6bcdda1f.pdf", expectedStatus: [200] },
  { id: "T9", name: "Thumbnail Media Streaming", path: "/api/media/papers/thumbnails/CHY1009_2025_FAT_A1_Set_6_6bcdda1f_thumb.webp", expectedStatus: [200] },
  { id: "T10", name: "Invalid Paper ID", path: "/paper/000000000000000000000000", expectedStatus: [404, 307] },
  { id: "T11", name: "Malformed Search Request", path: "/api/papers", expectedStatus: [400] },
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function sendRequest(baseUrl, testItem) {
  return new Promise((resolve, reject) => {
    const fullUrl = new URL(testItem.path, baseUrl);
    const client = fullUrl.protocol === "https:" ? https : http;

    const req = client.request(
      fullUrl,
      {
        method: "GET",
        headers: {
          "User-Agent": "PyqVitAp-Phase6B-Validator",
          "X-Pyq-Test-ID": testItem.id,
          "Accept": "*/*",
        },
        timeout: 15000,
      },
      (res) => {
        // Discard body chunks completely
        res.on("data", () => {});
        res.on("end", () => {
          resolve({
            id: testItem.id,
            name: testItem.name,
            path: testItem.path,
            status: res.statusCode,
            cfRay: res.headers["cf-ray"] || null,
            xCache: res.headers["x-cache"] || null,
            contentType: res.headers["content-type"] || null,
            cacheControl: res.headers["cache-control"] || null,
            date: res.headers["date"] || null,
            headers: {
              "cf-ray": res.headers["cf-ray"],
              "x-cache": res.headers["x-cache"],
              "content-type": res.headers["content-type"],
              "cache-control": res.headers["cache-control"],
            },
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
        error: err.message,
        cfRay: null,
        xCache: null,
      });
    });

    req.on("timeout", () => {
      req.destroy(new Error("Request timed out after 15s"));
    });

    req.end();
  });
}

function parseTailEvents(tailFilePath, candidateVersionId) {
  if (!fs.existsSync(tailFilePath)) return [];
  const raw = fs.readFileSync(tailFilePath, "utf8");

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
          // Filter candidate version if specified
          if (!candidateVersionId || (parsed.scriptVersion && parsed.scriptVersion.id === candidateVersionId)) {
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

async function main() {
  const args = process.argv.slice(2);
  let baseUrl = "";
  let candidateVersionId = "";
  let tailFile = "scripts/candidate-tail.jsonl";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--base-url" && args[i + 1]) {
      baseUrl = args[i + 1];
      i++;
    } else if (args[i] === "--candidate-version-id" && args[i + 1]) {
      candidateVersionId = args[i + 1];
      i++;
    } else if (args[i] === "--tail-file" && args[i + 1]) {
      tailFile = args[i + 1];
      i++;
    }
  }

  if (!baseUrl) {
    console.error("Usage: node scripts/run-phase6b-test.cjs --base-url <https://...workers.dev> [--candidate-version-id <uuid>] [--tail-file <path>]");
    process.exit(1);
  }

  console.log("===============================================================");
  console.log("PYQVITAP PHASE 6B BOUNDED EDGE TEST RUNNER");
  console.log("Target Base URL:", baseUrl);
  console.log("Candidate Version ID:", candidateVersionId || "(All in tail file)");
  console.log("Tail File Path:", tailFile);
  console.log("===============================================================\n");

  const results = [];
  let stopTriggered = false;
  let stopReason = "";

  for (let i = 0; i < TEST_MATRIX.length; i++) {
    const testItem = TEST_MATRIX[i];
    console.log(`[${i + 1}/${TEST_MATRIX.length}] Executing ${testItem.id}: ${testItem.name} (${testItem.path})`);

    const res = await sendRequest(baseUrl, testItem);
    results.push(res);

    console.log(`  -> Status: ${res.status} | Ray ID: ${res.cfRay || "NONE"} | X-Cache: ${res.xCache || "N/A"}`);

    // Check stop conditions
    if (!testItem.expectedStatus.includes(res.status)) {
      stopTriggered = true;
      stopReason = `Unexpected status ${res.status} on ${testItem.id} (expected ${testItem.expectedStatus.join(",")})`;
      console.error(`  [STOP TRIGGERED] ${stopReason}`);
      break;
    }

    if (res.status === 1102) {
      stopTriggered = true;
      stopReason = `Cloudflare Error 1102 (exceededCpu) on ${testItem.id}`;
      console.error(`  [STOP TRIGGERED] ${stopReason}`);
      break;
    }

    if (i < TEST_MATRIX.length - 1) {
      await sleep(1500); // 1.5s mandatory delay
    }
  }

  console.log("\nWaiting 4.0 seconds for edge tail stream to flush events...");
  await sleep(4000);

  // Parse telemetry events
  console.log("Parsing telemetry events from:", tailFile);
  const tailEvents = parseTailEvents(tailFile, candidateVersionId);
  console.log(`Found ${tailEvents.length} candidate telemetry events in tail log.`);

  // Build correlation map by cf-ray
  const rayMap = new Map();
  for (const ev of tailEvents) {
    const ray = ev.event?.request?.headers?.["cf-ray"] || ev.event?.request?.headers?.["cf_ray"];
    if (ray) {
      rayMap.set(ray.toLowerCase(), ev);
    }
  }

  // Correlate results with telemetry
  const finalReport = [];
  let exceededCpuCount = 0;
  let exceededMemoryCount = 0;
  let totalExceptions = 0;

  for (const r of results) {
    let matchedEv = null;
    if (r.cfRay) {
      matchedEv = rayMap.get(r.cfRay.toLowerCase());
    }

    // Fallback: match by URL if ray ID missing or exact match
    if (!matchedEv) {
      matchedEv = tailEvents.find((e) => {
        const u = e.event?.request?.url || "";
        return u.includes(r.path) || (e.event?.request?.headers?.["x-pyq-test-id"] === r.id);
      });
    }

    const item = {
      testId: r.id,
      name: r.name,
      path: r.path,
      httpStatus: r.status,
      cfRay: r.cfRay,
      xCache: r.xCache,
      outcome: matchedEv ? matchedEv.outcome || "unknown" : "NO_EVENT_CAPTURED",
      rawCpuMicroseconds: matchedEv && typeof matchedEv.cpuTime === "number" ? matchedEv.cpuTime : null,
      cpuMs: matchedEv && typeof matchedEv.cpuTime === "number" ? (matchedEv.cpuTime / 1000).toFixed(3) : null,
      rawWallMicroseconds: matchedEv && typeof matchedEv.wallTime === "number" ? matchedEv.wallTime : null,
      wallMs: matchedEv && typeof matchedEv.wallTime === "number" ? (matchedEv.wallTime / 1000).toFixed(3) : null,
      exceptions: matchedEv?.exceptions || [],
    };

    if (item.outcome === "exceededCpu") exceededCpuCount++;
    if (item.outcome === "exceededMemory") exceededMemoryCount++;
    if (item.exceptions && item.exceptions.length > 0) totalExceptions += item.exceptions.length;

    finalReport.push(item);
  }

  // Write output json
  const outputSummary = {
    timestamp: new Date().toISOString(),
    baseUrl,
    candidateVersionId,
    stopTriggered,
    stopReason: stopReason || null,
    totalTestsExecuted: results.length,
    testsPassed: finalReport.filter((t) => t.httpStatus === 200 || (t.testId === "T10" && [404, 307].includes(t.httpStatus)) || (t.testId === "T11" && t.httpStatus === 400)).length,
    exceededCpuCount,
    exceededMemoryCount,
    totalExceptions,
    telemetryEventsCaptured: tailEvents.length,
    report: finalReport,
  };

  const outputPath = "scripts/phase6b-test-results.json";
  fs.writeFileSync(outputPath, JSON.stringify(outputSummary, null, 2));
  console.log(`\nWrote complete test results to: ${outputPath}`);

  console.log("\n===============================================================");
  console.log("PHASE 6B EXECUTION SUMMARY");
  console.log("===============================================================");
  console.table(
    finalReport.map((f) => ({
      Test: f.testId,
      Path: f.path.length > 35 ? f.path.slice(0, 32) + "..." : f.path,
      HTTP: f.httpStatus,
      RayID: f.cfRay ? f.cfRay.slice(0, 10) + "..." : "NONE",
      Outcome: f.outcome,
      "CPU (ms)": f.cpuMs ? `${f.cpuMs} ms` : "N/A",
      "Wall (ms)": f.wallMs ? `${f.wallMs} ms` : "N/A",
      Cache: f.xCache || "-",
    }))
  );

  if (stopTriggered) {
    console.error(`\n[FAIL] Phase 6B stopped prematurely: ${stopReason}`);
    process.exit(1);
  } else if (exceededCpuCount > 0 || exceededMemoryCount > 0) {
    console.error(`\n[FAIL] Resource limit exceeded (exceededCpu: ${exceededCpuCount}, exceededMemory: ${exceededMemoryCount})`);
    process.exit(1);
  } else {
    console.log("\n[SUCCESS] Phase 6B edge testing completed with zero resource limit errors.");
  }
}

main().catch((e) => {
  console.error("Fatal test runner error:", e);
  process.exit(1);
});
