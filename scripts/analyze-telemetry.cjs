// @ts-nocheck
/**
 * Telemetry Analyzer for Wrangler Tail Output (handling multi-line JSON stream)
 */
const fs = require("node:fs");

function analyze() {
  if (!fs.existsSync("scripts/wrangler-tail.jsonl")) {
    console.log("No wrangler-tail.jsonl found.");
    return;
  }

  const raw = fs.readFileSync("scripts/wrangler-tail.jsonl", "utf8");
  
  // Parse multi-line JSON stream by splitting on top-level object boundaries
  // or scanning brace matching
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
      if (depth === 0) {
        startIdx = i;
      }
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && startIdx !== -1) {
        const jsonStr = raw.substring(startIdx, i + 1);
        try {
          events.push(JSON.parse(jsonStr));
        } catch (e) {
          // ignore malformed chunks
        }
        startIdx = -1;
      }
    }
  }

  console.log(`Total captured events in wrangler tail: ${events.length}`);

  const cpuTimes = [];
  const wallTimes = [];
  const statusCounts = {};
  const outcomeCounts = {};
  let totalExceptions = 0;
  const scriptVersions = {};

  for (const ev of events) {
    const outcome = ev.outcome || "unknown";
    outcomeCounts[outcome] = (outcomeCounts[outcome] || 0) + 1;

    if (ev.scriptVersion && ev.scriptVersion.id) {
      scriptVersions[ev.scriptVersion.id] = (scriptVersions[ev.scriptVersion.id] || 0) + 1;
    }

    if (ev.exceptions && ev.exceptions.length > 0) {
      totalExceptions += ev.exceptions.length;
    }

    if (ev.event && ev.event.response) {
      const s = ev.event.response.status;
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    }

    // cpuTime in microseconds
    if (typeof ev.cpuTime === "number") {
      cpuTimes.push(ev.cpuTime / 1000); // ms
    }
    if (typeof ev.wallTime === "number") {
      wallTimes.push(ev.wallTime / 1000); // ms
    }
  }

  cpuTimes.sort((a, b) => a - b);
  wallTimes.sort((a, b) => a - b);

  const minCpu = cpuTimes.length ? cpuTimes[0].toFixed(3) : "0.000";
  const maxCpu = cpuTimes.length ? cpuTimes[cpuTimes.length - 1].toFixed(3) : "0.000";
  const avgCpu = cpuTimes.length
    ? (cpuTimes.reduce((a, b) => a + b, 0) / cpuTimes.length).toFixed(3)
    : "0.000";
  const p50Cpu = cpuTimes.length
    ? cpuTimes[Math.floor(cpuTimes.length * 0.5)].toFixed(3)
    : "0.000";
  const p95Cpu = cpuTimes.length
    ? cpuTimes[Math.floor(cpuTimes.length * 0.95)].toFixed(3)
    : "0.000";
  const p99Cpu = cpuTimes.length
    ? cpuTimes[Math.floor(cpuTimes.length * 0.99)].toFixed(3)
    : "0.000";

  console.log("\n--- SCRIPT VERSIONS ---");
  console.log(JSON.stringify(scriptVersions, null, 2));

  console.log("\n--- CPU TIME (ms) ---");
  console.log(`Min: ${minCpu} ms`);
  console.log(`Avg: ${avgCpu} ms`);
  console.log(`P50: ${p50Cpu} ms`);
  console.log(`P95: ${p95Cpu} ms`);
  console.log(`P99: ${p99Cpu} ms`);
  console.log(`Max: ${maxCpu} ms`);
  console.log(`Workers Free Limit: 10.0 ms/request`);
  console.log(`P95 Under Limit: ${Number(p95Cpu) <= 10 ? "YES" : "NO"}`);
  console.log(`Max Under Limit: ${Number(maxCpu) <= 10 ? "YES" : "NO"}`);

  console.log("\n--- OUTCOMES ---");
  console.log(JSON.stringify(outcomeCounts, null, 2));

  console.log("\n--- EXCEPTIONS ---");
  console.log(`Total exceptions: ${totalExceptions}`);

  // Write out summary object
  const summary = {
    totalEvents: events.length,
    scriptVersions,
    cpuMs: { min: minCpu, avg: avgCpu, p50: p50Cpu, p95: p95Cpu, p99: p99Cpu, max: maxCpu },
    outcomes: outcomeCounts,
    totalExceptions,
  };
  fs.writeFileSync("scripts/telemetry-summary.json", JSON.stringify(summary, null, 2));
}

analyze();
