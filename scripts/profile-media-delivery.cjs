// @ts-nocheck
/**
 * Media Delivery Profiling & Performance Measurement Suite
 * Measures R2 direct, Media Gateway (localhost), Concurrency, and Range handling.
 */

const fs = require("fs");
const path = require("path");
const http = require("http");
const { performance } = require("perf_hooks");
const { S3Client, GetObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");

// Load Environment
function loadEnv() {
  const envFiles = [".env.local", ".env"];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf8");
      for (const rawLine of content.split("\n")) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;
        const idx = line.indexOf("=");
        if (idx === -1) continue;
        const key = line.slice(0, idx).trim();
        let val = line.slice(idx + 1).trim().replace(/^["'"'"']|["'"'"']$/g, "");
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}
loadEnv();

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const THUMBNAILS = [
  "papers/thumbnails/CHY1001_2021-22_CAT_c0e59637_thumb.webp",
  "papers/thumbnails/CHY1001_2021-22_FAT_0f5e5597_thumb.webp",
  "papers/thumbnails/CHY1001_2021-22_FAT_d3bd3d3a_thumb.webp",
  "papers/thumbnails/CHY1001_2022-23_CAT1_ced96c42_thumb.webp",
  "papers/thumbnails/CHY1001_2022-23_CAT_d8e56dea_thumb.webp",
  "papers/thumbnails/CHY1001_2022-23_CAT_f23b54f6_thumb.webp",
  "papers/thumbnails/CHY1001_2022-23_FAT_87c27f67_thumb.webp",
  "papers/thumbnails/CHY1001_2022-23_FAT_9602265c_thumb.webp",
  "papers/thumbnails/CHY1001_2022-23_FAT_eaf0f49a_thumb.webp",
  "papers/thumbnails/CHY1001_2023-24_CAT1_5a918cb3_thumb.webp",
];

const PDFS = [
  { key: "papers/pdfs/CHY1001_2022-23_CAT_d8e56dea.pdf", label: "Small (~46KB)" },
  { key: "papers/pdfs/CHY1001_2022-23_CAT1_ced96c42.pdf", label: "Small-Med (~63KB)" },
  { key: "papers/pdfs/CHY1008_2023-24_FAT_085bbab7.pdf", label: "Medium (~100KB)" },
  { key: "papers/pdfs/CHY1009_2023-24_CAT1_0027ac0d.pdf", label: "Med-Large (~131KB)" },
  { key: "papers/pdfs/CSE0305_2025-26_FAT_a1d65f36.pdf", label: "Large (~1.78MB)" },
];

function calcStats(numbers) {
  if (!numbers.length) return { min: 0, max: 0, avg: 0, p50: 0, p95: 0 };
  const sorted = [...numbers].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const avg = sorted.reduce((sum, n) => sum + n, 0) / sorted.length;
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || max;
  return { min, max, avg, p50, p95 };
}

// Direct S3/R2 API measurement
async function measureDirectR2(key) {
  const t0 = performance.now();
  const res = await s3.send(new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME || "pyqvitap-media",
    Key: key,
  }));
  const tHeaders = performance.now();

  let firstByteTime = null;
  let totalBytes = 0;
  for await (const chunk of res.Body) {
    if (firstByteTime === null) firstByteTime = performance.now();
    totalBytes += chunk.length;
  }
  const tEnd = performance.now();

  return {
    key,
    size: res.ContentLength,
    r2HeadersMs: Math.round(tHeaders - t0),
    r2FirstByteMs: Math.round((firstByteTime ?? tEnd) - t0),
    r2TotalMs: Math.round(tEnd - t0),
  };
}

// HTTP Gateway measurement against localhost:3000
function fetchGateway(urlPath, options = {}) {
  return new Promise((resolve, reject) => {
    const t0 = performance.now();
    let tFirstByte = null;
    let tHeaders = null;

    const reqOptions = {
      hostname: "localhost",
      port: 3000,
      path: urlPath,
      method: options.method || "GET",
      headers: options.headers || {},
    };

    const req = http.request(reqOptions, (res) => {
      tHeaders = performance.now();
      const chunks = [];
      let totalBytes = 0;

      res.on("data", (chunk) => {
        if (tFirstByte === null) tFirstByte = performance.now();
        chunks.push(chunk);
        totalBytes += chunk.length;
      });

      res.on("end", () => {
        const tEnd = performance.now();
        resolve({
          status: res.statusCode,
          headers: res.headers,
          ttfbMs: Math.round(tHeaders - t0),
          firstByteMs: Math.round((tFirstByte ?? tEnd) - t0),
          totalMs: Math.round(tEnd - t0),
          bodyLength: totalBytes,
        });
      });
    });

    req.on("error", (err) => reject(err));
    req.end();
  });
}

async function run() {
  console.log("============================================================");
  console.log("PHASE 6B FULL MEDIA DELIVERY PERFORMANCE INVESTIGATION");
  console.log("============================================================\n");

  // 1. Direct R2 Baseline
  console.log("--- 1. DIRECT R2 PERFORMANCE PROFILE (Cloudflare R2 Endpoint) ---");
  console.log("Measuring direct S3 network connection to R2 (without Next/Worker)...\n");

  const r2ThumbResults = [];
  for (const key of THUMBNAILS) {
    const m = await measureDirectR2(key);
    r2ThumbResults.push(m);
    console.log(`  R2 Direct Thumb: ${path.basename(key)} (${m.size} B) -> Headers: ${m.r2HeadersMs}ms, FirstByte: ${m.r2FirstByteMs}ms, Total: ${m.r2TotalMs}ms`);
  }

  const r2PdfResults = [];
  for (const item of PDFS) {
    const m = await measureDirectR2(item.key);
    r2PdfResults.push(m);
    console.log(`  R2 Direct PDF: ${item.label} ${path.basename(item.key)} (${m.size} B) -> Headers: ${m.r2HeadersMs}ms, FirstByte: ${m.r2FirstByteMs}ms, Total: ${m.r2TotalMs}ms`);
  }

  // 2. Gateway Single-Request Thumbnail Performance
  console.log("\n--- 2. THUMBNAIL PERFORMANCE VIA MEDIA GATEWAY (/api/media/...) ---");
  const gwThumbResults = [];
  for (let i = 0; i < THUMBNAILS.length; i++) {
    const key = THUMBNAILS[i];
    const r2Direct = r2ThumbResults[i];
    const gw = await fetchGateway("/api/media/" + key);
    gwThumbResults.push({ key, r2Direct, gw });
    console.log(`  Thumb #${i + 1}: ${path.basename(key)} | Status: ${gw.status} | Size: ${gw.bodyLength} B | Gateway TTFB: ${gw.ttfbMs}ms | Total: ${gw.totalMs}ms | Cache-Control: ${gw.headers["cache-control"]}`);
  }

  const gwThumbTotals = gwThumbResults.map(r => r.gw.totalMs);
  const gwThumbTTFB = gwThumbResults.map(r => r.gw.ttfbMs);
  const thumbStats = calcStats(gwThumbTotals);
  const thumbTtfbStats = calcStats(gwThumbTTFB);

  console.log("\n  Thumbnail Gateway Stats (Total Latency):");
  console.log(`    Count: ${gwThumbResults.length}`);
  console.log(`    Min: ${thumbStats.min} ms`);
  console.log(`    Max: ${thumbStats.max} ms`);
  console.log(`    Average: ${Math.round(thumbStats.avg)} ms`);
  console.log(`    Median (p50): ${thumbStats.p50} ms`);
  console.log(`    p95: ${thumbStats.p95} ms`);
  console.log(`    Requests > 1s: ${gwThumbTotals.filter(t => t > 1000).length}`);
  console.log(`    Requests > 3s: ${gwThumbTotals.filter(t => t > 3000).length}`);
  console.log(`    Requests > 5s: ${gwThumbTotals.filter(t => t > 5000).length}`);
  console.log(`    Requests > 10s: ${gwThumbTotals.filter(t => t > 10000).length}`);

  // 3. Gateway Single-Request PDF Performance
  console.log("\n--- 3. PDF PERFORMANCE VIA MEDIA GATEWAY (/api/media/...) ---");
  const gwPdfResults = [];
  for (let i = 0; i < PDFS.length; i++) {
    const item = PDFS[i];
    const r2Direct = r2PdfResults[i];
    const gw = await fetchGateway("/api/media/" + item.key);
    gwPdfResults.push({ item, r2Direct, gw });
    console.log(`  PDF #${i + 1} (${item.label}): ${path.basename(item.key)} | Status: ${gw.status} | Size: ${gw.bodyLength} B | TTFB: ${gw.ttfbMs}ms | FirstByte: ${gw.firstByteMs}ms | Total: ${gw.totalMs}ms | Cache-Control: ${gw.headers["cache-control"]}`);
  }

  // 4. Concurrency Profiling
  console.log("\n--- 4. CONCURRENCY PROFILING (Simultaneous Requests to Gateway) ---");

  for (const concurrency of [1, 5, 10, 20]) {
    const testKeys = [];
    for (let c = 0; c < concurrency; c++) {
      testKeys.push(THUMBNAILS[c % THUMBNAILS.length]);
    }

    const tStart = performance.now();
    const promises = testKeys.map(k => fetchGateway("/api/media/" + k));
    const results = await Promise.all(promises);
    const tDuration = Math.round(performance.now() - tStart);

    const latencies = results.map(r => r.totalMs);
    const failures = results.filter(r => r.status !== 200).length;
    const stats = calcStats(latencies);

    console.log(`  Concurrency ${concurrency} Thumbnails:`);
    console.log(`    Total Batch Duration: ${tDuration} ms`);
    console.log(`    Failures: ${failures}`);
    console.log(`    p50: ${stats.p50} ms | p95: ${stats.p95} ms | Max: ${stats.max} ms`);
  }

  // PDF Concurrency (1 vs 2)
  console.log("\n  PDF Concurrency Test:");
  for (const concurrency of [1, 2]) {
    const testPdfs = PDFS.slice(0, concurrency);
    const tStart = performance.now();
    const promises = testPdfs.map(p => fetchGateway("/api/media/" + p.key));
    const results = await Promise.all(promises);
    const tDuration = Math.round(performance.now() - tStart);
    const latencies = results.map(r => r.totalMs);
    const stats = calcStats(latencies);
    console.log(`    Concurrency ${concurrency} PDFs: Duration: ${tDuration}ms | p50: ${stats.p50}ms | Max: ${stats.max}ms`);
  }

  // 5. HTTP Range Request Evaluation
  console.log("\n--- 5. HTTP RANGE REQUEST EVALUATION (PDF Gateway) ---");
  const samplePdf = PDFS[0].key;
  const range0to1023 = await fetchGateway("/api/media/" + samplePdf, {
    headers: { Range: "bytes=0-1023" }
  });
  console.log("  Request: Range: bytes=0-1023");
  console.log(`    Status Code: ${range0to1023.status} (Expected 206 for range support, got ${range0to1023.status})`);
  console.log(`    Content-Range Header: ${range0to1023.headers["content-range"] || "NONE"}`);
  console.log(`    Accept-Ranges Header: ${range0to1023.headers["accept-ranges"] || "NONE"}`);
  console.log(`    Content-Length Header: ${range0to1023.headers["content-length"]}`);
  console.log(`    Body Received: ${range0to1023.bodyLength} bytes (Expected 1024 for range, got ${range0to1023.bodyLength})`);

  console.log("\n============================================================");
  console.log("PROFILING COMPLETE");
  console.log("============================================================\n");
}

run().catch((err) => {
  console.error("Profiling script failed:", err);
  process.exit(1);
});
