// @ts-nocheck
/**
 * Local Database Concurrency Test Runner
 * Validates that concurrent requests to MongoDB routes do not race or fail
 */
const http = require("node:http");

const TARGET_HOST = "localhost";
const TARGET_PORT = 3000;

function sendReq(path) {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = http.request(
      {
        hostname: TARGET_HOST,
        port: TARGET_PORT,
        path,
        method: "GET",
        headers: { Accept: "*/*" },
        timeout: 20000,
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          resolve({
            path,
            status: res.statusCode,
            duration: Date.now() - start,
            bytes: body.length,
            bodySample: body.slice(0, 150),
          });
        });
      }
    );

    req.on("timeout", () => {
      req.destroy();
      resolve({ path, status: 408, duration: Date.now() - start, error: "TIMEOUT" });
    });

    req.on("error", (err) => {
      resolve({ path, status: 0, duration: Date.now() - start, error: err.message });
    });

    req.end();
  });
}

async function runBatch(batchNum, paths) {
  console.log(`\n--- Running Batch ${batchNum} (${paths.length} concurrent requests) ---`);
  const promises = paths.map((p) => sendReq(p));
  const results = await Promise.all(promises);

  let allOk = true;
  for (const r of results) {
    console.log(
      `  [${r.status === 200 ? "PASS" : "FAIL"}] ${r.path} -> Status: ${r.status}, Time: ${r.duration}ms, Size: ${r.bytes || 0}B`
    );
    if (r.status !== 200) {
      allOk = false;
      console.error(`    Error details:`, r.error || r.bodySample);
    }
  }
  return allOk;
}

async function main() {
  console.log("============================================================");
  console.log("STARTING LOCAL MONGODB CONCURRENCY VERIFICATION");
  console.log("============================================================");

  // Warmup single request
  console.log("\nWarming up single request...");
  const warmup = await sendReq("/api/health");
  console.log(`Warmup status: ${warmup.status} (${warmup.duration}ms)`);

  let totalBatches = 0;
  let passedBatches = 0;

  // Test 1: The exact previously failing pattern: /api/course-list + /api/papers/count parallel
  for (let i = 1; i <= 3; i++) {
    totalBatches++;
    const ok = await runBatch(`1.${i} (Course-List + Papers-Count Parallel)`, [
      "/api/course-list",
      "/api/papers/count",
      "/api/course-list",
      "/api/papers/count",
    ]);
    if (ok) passedBatches++;
  }

  // Test 2: Mixed concurrent routes: Course-list, count, papers by subject, paper by ID, paper SSR
  for (let i = 1; i <= 3; i++) {
    totalBatches++;
    const ok = await runBatch(`2.${i} (Full Mixed MongoDB Operations)`, [
      "/api/course-list",
      "/api/papers/count",
      "/api/papers?subject=Calculus",
      "/api/paper-by-id/6aaf7dc6faf057904421b8fd",
      "/paper/6aaf7dc6faf057904421b8fd",
    ]);
    if (ok) passedBatches++;
  }

  // Test 3: Burst of 10 concurrent requests across all routes
  totalBatches++;
  const burstOk = await runBatch("3.1 (Burst of 10 Concurrent Requests)", [
    "/api/course-list",
    "/api/papers/count",
    "/api/papers?subject=Calculus",
    "/api/paper-by-id/6aaf7dc6faf057904421b8fd",
    "/paper/6aaf7dc6faf057904421b8fd",
    "/api/course-list",
    "/api/papers/count",
    "/api/papers?subject=Calculus",
    "/api/paper-by-id/6aaf7dc6faf057904421b8fd",
    "/paper/6aaf7dc6faf057904421b8fd",
  ]);
  if (burstOk) passedBatches++;

  console.log("\n============================================================");
  console.log(`SUMMARY: ${passedBatches}/${totalBatches} batches passed completely!`);
  console.log("============================================================");

  if (passedBatches === totalBatches) {
    console.log("ALL CONCURRENCY TESTS PASSED WITH 0 HANGS AND 0 500 ERRORS!");
    process.exit(0);
  } else {
    console.error("FAILURES DETECTED IN CONCURRENCY TESTS.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
