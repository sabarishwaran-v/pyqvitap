// @ts-nocheck
/**
 * PyqVitAp Phase 9 Canary Deployment Audit & Telemetry Inspector
 */
const https = require("node:https");
const fs = require("node:fs");
const path = require("node:path");

const CANDIDATE_VERSION_ID = "d6d7b1bb-e70d-4099-a54a-30b111a39f97";
const STABLE_VERSION_ID = "425233e0-b2bb-4c75-ae97-6204655c647d";
const BASE_URL = "https://pyqvitap.site";
const TAIL_FILE = path.join(__dirname, "phase9_canary_tail.jsonl");
const REPORT_FILE = path.join(__dirname, "phase9-canary-report.json");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function sendReq(urlPath, headers = {}) {
  return new Promise((resolve) => {
    const fullUrl = new URL(urlPath, BASE_URL);
    const start = Date.now();

    const req = https.request(
      fullUrl,
      {
        method: "GET",
        headers: {
          "User-Agent": "PyqVitAp-Phase9-Canary-Monitor",
          "Accept": "*/*",
          ...headers,
        },
        timeout: 15000,
      },
      (res) => {
        const rawRay = res.headers["cf-ray"] || null;
        let bareRay = null;
        if (rawRay) {
          bareRay = rawRay.split("-")[0].trim().toLowerCase();
        }
        res.on("data", () => {});
        res.on("end", () => {
          resolve({
            path: urlPath,
            status: res.statusCode,
            rawRay,
            bareRay,
            durationMs: Date.now() - start,
            xCache: res.headers["x-cache"] || null,
          });
        });
      }
    );

    req.on("error", (e) => {
      resolve({
        path: urlPath,
        status: null,
        rawRay: null,
        bareRay: null,
        durationMs: Date.now() - start,
        error: e.message,
      });
    });

    req.on("timeout", () => {
      req.destroy(new Error("Request timed out"));
    });

    req.end();
  });
}

function parseTail(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, "utf8");
  const events = [];
  let depth = 0;
  let startIdx = -1;
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (escapeNext) { escapeNext = false; continue; }
    if (ch === "\\") { escapeNext = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (ch === "{") {
      if (depth === 0) startIdx = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && startIdx !== -1) {
        const s = raw.substring(startIdx, i + 1);
        try {
          events.push(JSON.parse(s));
        } catch {}
        startIdx = -1;
      }
    }
  }
  return events;
}

async function run() {
  console.log("===============================================================");
  console.log("PYQVITAP PHASE 9 CANARY TELEMETRY AUDIT");
  console.log("Target:", BASE_URL);
  console.log("Stable Version (90%):", STABLE_VERSION_ID);
  console.log("Candidate Version (10%):", CANDIDATE_VERSION_ID);
  console.log("===============================================================\n");

  const sentRequests = [];

  // 1. Natural traffic requests (should route 90% to stable, 10% to candidate naturally)
  console.log("Sending natural traffic sample requests (no override headers)...");
  const naturalPaths = [
    "/api/health",
    "/paper/6aa2e4bcb94edf2397e2376c",
    "/api/course-list",
    "/api/papers?subject=ENVIRONMENTAL%20STUDIES%20[CHY1001]",
    "/paper/6aa2e4bcb94edf2397e2376c",
  ];

  for (const p of naturalPaths) {
    const res = await sendReq(p);
    sentRequests.push({ ...res, mode: "natural" });
    console.log(`  [Natural] ${p} -> Status: ${res.status} | Ray: ${res.rawRay}`);
    await sleep(1500);
  }

  // 2. Targeted canary requests (force candidate routing via override header to guarantee candidate metrics)
  console.log("\nSending targeted canary sample requests (via override header)...");
  const canaryPaths = [
    "/api/health",
    "/paper/6aa2e4bcb94edf2397e2376c",
    "/api/course-list",
    "/api/papers?subject=ENVIRONMENTAL%20STUDIES%20[CHY1001]",
  ];

  for (const p of canaryPaths) {
    const res = await sendReq(p, {
      "Cloudflare-Workers-Version-Overrides": `pyqvitap-migration-test="${CANDIDATE_VERSION_ID}"`,
    });
    sentRequests.push({ ...res, mode: "canary_override" });
    console.log(`  [Canary Override] ${p} -> Status: ${res.status} | Ray: ${res.rawRay}`);
    await sleep(1500);
  }

  console.log("\nWaiting 6.0s for edge tail stream to flush events...");
  await sleep(6000);

  const tailEvents = parseTail(TAIL_FILE);
  console.log(`Total tail events captured: ${tailEvents.length}`);

  const candidateEvents = tailEvents.filter((e) => e.scriptVersion?.id === CANDIDATE_VERSION_ID);
  const stableEvents = tailEvents.filter((e) => e.scriptVersion?.id === STABLE_VERSION_ID);
  const otherEvents = tailEvents.filter(
    (e) => e.scriptVersion?.id !== CANDIDATE_VERSION_ID && e.scriptVersion?.id !== STABLE_VERSION_ID
  );

  console.log(`- Candidate (${CANDIDATE_VERSION_ID}): ${candidateEvents.length} events`);
  console.log(`- Stable (${STABLE_VERSION_ID}): ${stableEvents.length} events`);
  if (otherEvents.length > 0) {
    console.log(`- Other versions: ${otherEvents.length} events`);
  }

  function analyze(events, label) {
    const outcomes = {};
    const statuses = {};
    const cpuTimes = [];
    const wallTimes = [];
    let totalExceptions = 0;

    for (const ev of events) {
      const oc = ev.outcome || "unknown";
      outcomes[oc] = (outcomes[oc] || 0) + 1;

      const st = ev.event?.response?.status || "none";
      statuses[st] = (statuses[st] || 0) + 1;

      if (typeof ev.cpuTime === "number") cpuTimes.push(ev.cpuTime);
      if (typeof ev.wallTime === "number") wallTimes.push(ev.wallTime);
      if (ev.exceptions && Array.isArray(ev.exceptions)) totalExceptions += ev.exceptions.length;
    }

    cpuTimes.sort((a, b) => a - b);
    wallTimes.sort((a, b) => a - b);

    const minCpu = cpuTimes.length ? cpuTimes[0] : 0;
    const maxCpu = cpuTimes.length ? cpuTimes[cpuTimes.length - 1] : 0;
    const avgCpu = cpuTimes.length ? (cpuTimes.reduce((a, b) => a + b, 0) / cpuTimes.length) : 0;
    const p95Cpu = cpuTimes.length ? cpuTimes[Math.floor(cpuTimes.length * 0.95)] : 0;

    return {
      version: label,
      totalEvents: events.length,
      outcomes,
      statuses,
      exceptions: totalExceptions,
      cpuMicroseconds: {
        min: minCpu,
        avg: Math.round(avgCpu),
        p95: p95Cpu,
        max: maxCpu,
      },
      cpuMs: {
        min: (minCpu / 1000).toFixed(3),
        avg: (avgCpu / 1000).toFixed(3),
        p95: (p95Cpu / 1000).toFixed(3),
        max: (maxCpu / 1000).toFixed(3),
      },
      wallMicroseconds: {
        min: wallTimes.length ? wallTimes[0] : 0,
        max: wallTimes.length ? wallTimes[wallTimes.length - 1] : 0,
      },
    };
  }

  const candidateStats = analyze(candidateEvents, "Candidate (d6d7b1bb)");
  const stableStats = analyze(stableEvents, "Stable (425233e0)");

  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    stableVersionId: STABLE_VERSION_ID,
    candidateVersionId: CANDIDATE_VERSION_ID,
    sentRequestsCount: sentRequests.length,
    sentRequests,
    totalTailEventsCaptured: tailEvents.length,
    candidateStats,
    stableStats,
  };

  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
  console.log(`\nWrote complete canary telemetry report to: ${REPORT_FILE}`);

  console.log("\n===============================================================");
  console.log("CANDIDATE VERSION TELEMETRY SUMMARY");
  console.log("===============================================================");
  console.log("Total candidate events:", candidateStats.totalEvents);
  console.log("Outcomes:", candidateStats.outcomes);
  console.log("HTTP Statuses:", candidateStats.statuses);
  console.log("Exceptions:", candidateStats.exceptions);
  console.log("CPU Time (min / avg / p95 / max):",
    `${candidateStats.cpuMs.min}ms / ${candidateStats.cpuMs.avg}ms / ${candidateStats.cpuMs.p95}ms / ${candidateStats.cpuMs.max}ms`
  );

  console.log("\n===============================================================");
  console.log("STABLE VERSION TELEMETRY SUMMARY");
  console.log("===============================================================");
  console.log("Total stable events:", stableStats.totalEvents);
  console.log("Outcomes:", stableStats.outcomes);
  console.log("HTTP Statuses:", stableStats.statuses);
  console.log("Exceptions:", stableStats.exceptions);
  console.log("CPU Time (min / avg / p95 / max):",
    `${stableStats.cpuMs.min}ms / ${stableStats.cpuMs.avg}ms / ${stableStats.cpuMs.p95}ms / ${stableStats.cpuMs.max}ms`
  );
}

run().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
