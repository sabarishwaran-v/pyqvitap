// @ts-nocheck
/**
 * Production Load Test Runner for PyqVitAp
 * Concurrency Stages: 100, 250, 500, 750, 1000
 */

const https = require("node:https");
const { URL } = require("node:url");

const TARGET_HOST = "pyqvitap.site";

const ROUTES = [
  { path: "/", method: "GET", name: "Homepage" },
  { path: "/catalogue", method: "GET", name: "Catalogue" },
  { path: "/api/health", method: "GET", name: "Health" },
  { path: "/disclaimer", method: "GET", name: "Disclaimer" },
  { path: "/paper/6aaf7dc6faf057904421b8fd", method: "GET", name: "Paper Details" },
  { path: "/api/media/papers/thumbnails/CHY1001_2021-22_CAT_c0e59637_thumb.webp", method: "GET", name: "Thumbnail" },
  { path: "/api/media/papers/pdfs/CHY1001_2021-22_CAT_c0e59637.pdf", method: "HEAD", name: "PDF HEAD" },
];

const agent = new https.Agent({
  keepAlive: true,
  maxSockets: 2500,
  maxFreeSockets: 1000,
  timeout: 15000,
});

function sendRequest(route) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const req = https.request(
      {
        hostname: TARGET_HOST,
        port: 443,
        path: route.path,
        method: route.method,
        agent,
        headers: {
          "User-Agent": "PyqVitAp-LoadTest/1.0",
          "Accept": "*/*",
        },
        timeout: 12000,
      },
      (res) => {
        let bodyBytes = 0;
        res.on("data", (chunk) => {
          bodyBytes += chunk.length;
        });
        res.on("end", () => {
          const duration = Date.now() - startTime;
          resolve({
            status: res.statusCode,
            duration,
            cfRay: res.headers["cf-ray"] || null,
            cfError: res.headers["cf-error-type"] || null,
          });
        });
      }
    );

    req.on("error", (err) => {
      const duration = Date.now() - startTime;
      resolve({
        status: 0,
        duration,
        error: err.message,
      });
    });

    req.on("timeout", () => {
      req.destroy();
      const duration = Date.now() - startTime;
      resolve({
        status: 408,
        duration,
        error: "TIMEOUT",
      });
    });

    req.end();
  });
}

async function runStage(concurrency, durationSec, maxRequests) {
  console.log(`\n============================================================`);
  console.log(`STARTING STAGE: Concurrency=${concurrency}, Duration=${durationSec}s, MaxReqs=${maxRequests}`);
  console.log(`============================================================`);

  const startTime = Date.now();
  const endTime = startTime + durationSec * 1000;
  const latencies = [];
  let totalRequests = 0;
  let successCount = 0;
  let clientErrors = 0; // 4xx
  let serverErrors = 0; // 5xx
  let timeoutCount = 0;
  let code1102Count = 0;
  let code1027Count = 0;
  let otherErrors = 0;

  let stopSignal = false;
  let activeWorkers = 0;

  async function worker(workerId) {
    activeWorkers++;
    let reqIndex = workerId;
    while (!stopSignal && Date.now() < endTime && totalRequests < maxRequests) {
      const route = ROUTES[reqIndex % ROUTES.length];
      reqIndex++;
      totalRequests++;

      const res = await sendRequest(route);
      latencies.push(res.duration);

      if (res.status === 200 || res.status === 204 || res.status === 304) {
        successCount++;
      } else if (res.status === 1102) {
        code1102Count++;
        console.error(`[CRITICAL] Cloudflare Error 1102 detected on ${route.path}!`);
        stopSignal = true;
      } else if (res.status === 1027) {
        code1027Count++;
        console.error(`[CRITICAL] Cloudflare Error 1027 (Daily Limit) detected on ${route.path}!`);
        stopSignal = true;
      } else if (res.status >= 500) {
        serverErrors++;
      } else if (res.status >= 400) {
        clientErrors++;
      } else if (res.error === "TIMEOUT") {
        timeoutCount++;
      } else {
        otherErrors++;
      }

      // Small throttle yield to avoid saturating Node event loop
      if (concurrency > 500 && reqIndex % 10 === 0) {
        await new Promise((r) => setImmediate(r));
      }
    }
    activeWorkers--;
  }

  // Launch workers
  const promises = [];
  for (let i = 0; i < concurrency; i++) {
    promises.push(worker(i));
  }

  await Promise.all(promises);

  const totalDuration = (Date.now() - startTime) / 1000;
  latencies.sort((a, b) => a - b);

  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const rps = (totalRequests / totalDuration).toFixed(1);
  const errorRate = (((serverErrors + timeoutCount + code1102Count + code1027Count) / totalRequests) * 100).toFixed(2);

  const stageResult = {
    concurrency,
    totalRequests,
    successCount,
    clientErrors,
    serverErrors,
    timeoutCount,
    code1102Count,
    code1027Count,
    otherErrors,
    p50,
    p95,
    p99,
    rps,
    durationSec: totalDuration.toFixed(2),
    errorRate: `${errorRate}%`,
    abortTriggered: stopSignal,
  };

  console.log(`STAGE RESULT:`, JSON.stringify(stageResult, null, 2));

  if (stopSignal) {
    console.error(`[ABORT] Load test halted due to critical error trigger.`);
  }

  return stageResult;
}

async function main() {
  const stageConfigs = [
    { concurrency: 100, durationSec: 10, maxReqs: 2000 },
    { concurrency: 250, durationSec: 12, maxReqs: 3500 },
    { concurrency: 500, durationSec: 12, maxReqs: 5000 },
    { concurrency: 750, durationSec: 12, maxReqs: 6500 },
    { concurrency: 1000, durationSec: 15, maxReqs: 8000 },
  ];

  const results = [];

  for (const config of stageConfigs) {
    const res = await runStage(config.concurrency, config.durationSec, config.maxReqs);
    results.push(res);

    if (res.abortTriggered || res.code1102Count > 0 || res.code1027Count > 0) {
      console.error(`Aborting remaining stages due to safety trigger.`);
      break;
    }

    // Cooldown pause between stages (3 seconds)
    console.log(`Cooling down for 3 seconds before next stage...`);
    await new Promise((r) => setTimeout(r, 3000));
  }

  console.log(`\n============================================================`);
  console.log(`FINAL LOAD TEST SUMMARY ACROSS ALL STAGES:`);
  console.log(`============================================================`);
  console.table(results);

  // Write results to JSON file for analysis
  const fs = require("node:fs");
  fs.writeFileSync("scripts/load-test-results.json", JSON.stringify(results, null, 2));
  console.log(`Saved detailed results to scripts/load-test-results.json`);
}

main().catch((err) => {
  console.error("Load test failed:", err);
  process.exit(1);
});
