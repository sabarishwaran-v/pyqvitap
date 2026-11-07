// @ts-nocheck
/**
 * Phase 6C-B.5.1: Proof-of-Concept for Per-Request MongoDB Connection Strategy
 * Tests dedicated, clean-closing connections to verify elimination of stale-socket failures.
 */
require("dotenv").config({ path: ".env" });
const { MongoClient } = require("mongodb");
const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_DIRECT_URI || process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI or MONGODB_DIRECT_URI");
  process.exit(1);
}

// Read-only queries using native MongoClient
async function runQueryWithNativeClient(label) {
  const start = Date.now();
  const client = new MongoClient(MONGODB_URI, {
    maxPoolSize: 1,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  });

  let connTime = 0;
  let queryTime = 0;
  let closeTime = 0;

  try {
    const t0 = Date.now();
    await client.connect();
    connTime = Date.now() - t0;

    const t1 = Date.now();
    const db = client.db();
    const [coursesCount, papersSample] = await Promise.all([
      db.collection("courses").countDocuments(),
      db.collection("papers").findOne({ isSelected: true }, { projection: { title: 1, subject: 1 } }),
    ]);
    queryTime = Date.now() - t1;

    const t2 = Date.now();
    await client.close(false); // Clean close
    closeTime = Date.now() - t2;

    const totalTime = Date.now() - start;
    return {
      success: true,
      label,
      totalTime,
      connTime,
      queryTime,
      closeTime,
      data: { coursesCount, sampleSubject: papersSample?.subject },
    };
  } catch (err) {
    try { await client.close(true); } catch (_) {}
    return {
      success: false,
      label,
      totalTime: Date.now() - start,
      connTime,
      queryTime,
      error: err.message,
    };
  }
}

// Read-only queries using mongoose.createConnection
async function runQueryWithMongooseConnection(label) {
  const start = Date.now();
  let connTime = 0;
  let queryTime = 0;
  let closeTime = 0;

  let conn = null;
  try {
    const t0 = Date.now();
    conn = await mongoose.createConnection(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 15000,
      maxPoolSize: 1,
    }).asPromise();
    connTime = Date.now() - t0;

    const t1 = Date.now();
    const coursesCount = await conn.collection("courses").countDocuments();
    const paperSample = await conn.collection("papers").findOne({ isSelected: true });
    queryTime = Date.now() - t1;

    const t2 = Date.now();
    await conn.close();
    closeTime = Date.now() - t2;

    const totalTime = Date.now() - start;
    return {
      success: true,
      label,
      totalTime,
      connTime,
      queryTime,
      closeTime,
      data: { coursesCount, sampleSubject: paperSample?.subject },
    };
  } catch (err) {
    if (conn) {
      try { await conn.close(); } catch (_) {}
    }
    return {
      success: false,
      label,
      totalTime: Date.now() - start,
      connTime,
      queryTime,
      error: err.message,
    };
  }
}

async function runSuite(driverName, runnerFn) {
  console.log(`\n============================================================`);
  console.log(`TEST SUITE: ${driverName}`);
  console.log(`============================================================`);

  // A. Request 1
  console.log(`\n--- Test A: Request 1 (Initial) ---`);
  const resA = await runnerFn("Request 1");
  console.log(`  [${resA.success ? "PASS" : "FAIL"}] Total: ${resA.totalTime}ms (Connect: ${resA.connTime}ms, Query: ${resA.queryTime}ms, Close: ${resA.closeTime || 0}ms)`);
  if (!resA.success) console.error("  Error:", resA.error);

  // B. Request 2 (After short delay)
  console.log(`\n--- Test B: Request 2 (Subsequent) ---`);
  await new Promise(r => setTimeout(r, 500));
  const resB = await runnerFn("Request 2");
  console.log(`  [${resB.success ? "PASS" : "FAIL"}] Total: ${resB.totalTime}ms (Connect: ${resB.connTime}ms, Query: ${resB.queryTime}ms, Close: ${resB.closeTime || 0}ms)`);
  if (!resB.success) console.error("  Error:", resB.error);

  // C. Concurrent Request 1 + Request 2
  console.log(`\n--- Test C: Concurrent Request 1 + Request 2 ---`);
  const [resC1, resC2] = await Promise.all([
    runnerFn("Concurrent 1"),
    runnerFn("Concurrent 2"),
  ]);
  console.log(`  [${resC1.success ? "PASS" : "FAIL"}] C1 Total: ${resC1.totalTime}ms (Connect: ${resC1.connTime}ms, Query: ${resC1.queryTime}ms)`);
  console.log(`  [${resC2.success ? "PASS" : "FAIL"}] C2 Total: ${resC2.totalTime}ms (Connect: ${resC2.connTime}ms, Query: ${resC2.queryTime}ms)`);

  // D. 5 Sequential Requests
  console.log(`\n--- Test D: 5 Sequential Requests ---`);
  const seq5Results = [];
  for (let i = 1; i <= 5; i++) {
    const r = await runnerFn(`Sequential ${i}`);
    seq5Results.push(r);
    console.log(`  [${r.success ? "PASS" : "FAIL"}] Seq ${i}: Total: ${r.totalTime}ms (Connect: ${r.connTime}ms, Query: ${r.queryTime}ms)`);
  }

  // E. 10 Concurrent Requests (Max safe burst)
  console.log(`\n--- Test E: 10 Concurrent Requests (Max limit safe burst) ---`);
  const startE = Date.now();
  const promises = Array.from({ length: 10 }, (_, i) => runnerFn(`Burst ${i + 1}`));
  const burstResults = await Promise.all(promises);
  const totalE = Date.now() - startE;
  const passCount = burstResults.filter(r => r.success).length;
  console.log(`  Burst summary: ${passCount}/10 PASS in ${totalE}ms`);
  const avgConn = Math.round(burstResults.reduce((acc, r) => acc + r.connTime, 0) / 10);
  const avgQuery = Math.round(burstResults.reduce((acc, r) => acc + r.queryTime, 0) / 10);
  const avgTotal = Math.round(burstResults.reduce((acc, r) => acc + r.totalTime, 0) / 10);
  console.log(`  Average per request: Total: ${avgTotal}ms (Connect: ${avgConn}ms, Query: ${avgQuery}ms)`);

  return { resA, resB, resC1, resC2, seq5Results, burstResults };
}

async function main() {
  await runSuite("Native MongoClient (Dedicated Per-Request)", runQueryWithNativeClient);
  await runSuite("Mongoose createConnection (Dedicated Per-Request)", runQueryWithMongooseConnection);
  console.log("\n============================================================");
  console.log("POC COMPLETE");
  console.log("============================================================\n");
}

main().catch(console.error);
