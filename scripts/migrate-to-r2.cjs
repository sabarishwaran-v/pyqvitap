// @ts-nocheck
/**
 * Cloudflare R2 Migration Runner & Hardened Tooling
 * PyqVitAp Phase 4.2 Migration Tooling
 *
 * Usage:
 *   node scripts/migrate-to-r2.cjs [--dry-run] [--execute] [--limit <N>] [--concurrency <N>] [--retry-failures]
 *
 * Defaults:
 *   - Mode: DRY-RUN (safe read-only mode, 0 writes to R2)
 *   - Target: All papers in MongoDB (when no --limit is provided)
 *   - Concurrency: 10 (configurable with --concurrency, capped at 10)
 *   - Real execution: Requires explicit --execute flag
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const https = require("https");
const http = require("http");
const mongoose = require("mongoose");
const { S3Client, HeadObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");

// 1. Safe Environment Loader
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
        let val = line.slice(idx + 1).trim();
        if (val.startsWith('"')) {
          const closingIdx = val.indexOf('"', 1);
          if (closingIdx !== -1) val = val.substring(1, closingIdx);
        } else if (val.startsWith("'")) {
          const closingIdx = val.indexOf("'", 1);
          if (closingIdx !== -1) val = val.substring(1, closingIdx);
        } else {
          val = val.split("#")[0].trim();
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}
loadEnv();

const FAILURES_FILE_PATH = path.resolve(__dirname, "migration-failures.json");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

// 2. Persistent Failure Log Manager
function loadFailures() {
  try {
    if (fs.existsSync(FAILURES_FILE_PATH)) {
      const data = fs.readFileSync(FAILURES_FILE_PATH, "utf8");
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (err) {
    console.warn(`[WARN] Could not parse ${FAILURES_FILE_PATH}, starting empty:`, err.message);
  }
  return [];
}

function saveFailures(failures) {
  try {
    fs.writeFileSync(FAILURES_FILE_PATH, JSON.stringify(failures, null, 2), "utf8");
  } catch (err) {
    console.error(`[ERROR] Failed to save failures log to disk:`, err.message);
  }
}

function recordFailure(entry) {
  const failures = loadFailures();
  const existingIdx = failures.findIndex((f) => f.key === entry.key && f.type === entry.type);
  if (existingIdx !== -1) {
    failures[existingIdx] = entry;
  } else {
    failures.push(entry);
  }
  saveFailures(failures);
}

function removeFailure(key, type) {
  const failures = loadFailures();
  const filtered = failures.filter((f) => !(f.key === key && f.type === type));
  if (filtered.length !== failures.length) {
    saveFailures(filtered);
  }
}

// 3. Resilient Network Fetch with Exponential Backoff
function fetchBufferOnce(url, redirectCount = 0) {
  if (redirectCount > 5) {
    return Promise.reject(new Error(`Too many redirects for URL: ${url}`));
  }
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    const req = client.get(url, { timeout: 30000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchBufferOnce(res.headers.location, redirectCount + 1)
          .then(resolve)
          .catch(reject);
      }
      if (res.statusCode !== 200) {
        const err = new Error(`HTTP ${res.statusCode} from ${url}`);
        err.statusCode = res.statusCode;
        return reject(err);
      }
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks)));
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Timeout downloading from ${url}`));
    });

    req.on("error", reject);
  });
}

async function fetchBufferWithRetry(url, maxRetries = 3) {
  let attempt = 0;
  while (true) {
    attempt++;
    try {
      return await fetchBufferOnce(url);
    } catch (err) {
      // Deterministic client errors (404, 400) should not be retried
      if (err.statusCode === 404 || err.statusCode === 400 || err.statusCode === 403) {
        throw err;
      }
      if (attempt > maxRetries) {
        throw new Error(`Failed after ${maxRetries} retries: ${err.message}`);
      }
      const backoffMs = Math.min(500 * Math.pow(2, attempt), 5000);
      await sleep(backoffMs);
    }
  }
}

// 4. Validation Helpers
function validatePdf(buffer) {
  if (!buffer || buffer.length < 10) {
    return { valid: false, reason: "Buffer too small to be a valid PDF" };
  }
  const isPdfHeader = buffer.slice(0, 5).toString("utf8").startsWith("%PDF");
  if (!isPdfHeader) {
    return { valid: false, reason: "Missing %PDF magic bytes" };
  }

  // EOF marker check: search last 2048 bytes to tolerate trailing whitespace/comments
  const searchWindow = Math.min(buffer.length, 2048);
  const tail = buffer.slice(buffer.length - searchWindow).toString("latin1");
  if (!tail.includes("%%EOF")) {
    return { valid: false, reason: "Missing %%EOF marker in file footer" };
  }

  return { valid: true };
}

function validateWebp(buffer) {
  if (!buffer || buffer.length < 12) {
    return { valid: false, reason: "Buffer too small to be a valid WebP image" };
  }
  const isRiff = buffer.slice(0, 4).toString("utf8") === "RIFF";
  const isWebp = buffer.slice(8, 12).toString("utf8") === "WEBP";
  if (!isRiff || !isWebp) {
    return { valid: false, reason: "Missing RIFF/WEBP signature" };
  }
  return { valid: true };
}

// 5. Deterministic Key Extraction
function extractKeyFromUrl(url, type) {
  try {
    const u = new URL(url);
    const match = u.pathname.match(/\/(?:raw|image)\/upload\/(?:v\d+\/)?(papers\/.+)$/);
    if (match && match[1]) {
      return match[1];
    }
    const filename = path.basename(u.pathname);
    return type === "pdf" ? `papers/pdfs/${filename}` : `papers/thumbnails/${filename}`;
  } catch {
    const filename = path.basename(url);
    return type === "pdf" ? `papers/pdfs/${filename}` : `papers/thumbnails/${filename}`;
  }
}

// 6. Fast Resume & Object Verification
async function inspectR2Object(s3Client, bucketName, key, expectedSha256) {
  if (!s3Client) {
    return { exists: false };
  }
  try {
    const head = await s3Client.send(
      new HeadObjectCommand({ Bucket: bucketName, Key: key })
    );

    const size = head.ContentLength || 0;
    const r2Sha = head.Metadata?.sha256;

    if (size > 0) {
      if (expectedSha256) {
        if (r2Sha && r2Sha.toLowerCase() === expectedSha256.toLowerCase()) {
          return { exists: true, valid: true, size, sha256: r2Sha };
        } else {
          return { exists: true, valid: false, size, r2Sha, expectedSha256, reason: "SHA-256 mismatch in R2 metadata" };
        }
      } else {
        // Thumbnail: valid if size > 0 and SHA-256 exists
        return { exists: true, valid: Boolean(r2Sha), size, sha256: r2Sha };
      }
    }
    return { exists: false };
  } catch (err) {
    if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
      return { exists: false };
    }
    throw err;
  }
}

async function run() {
  const args = process.argv.slice(2);
  const isExecute = args.includes("--execute");
  const isDryRun = !isExecute || args.includes("--dry-run");
  const isRetryFailures = args.includes("--retry-failures");

  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx !== -1 && args[limitIdx + 1] ? parseInt(args[limitIdx + 1], 10) : null;

  const concIdx = args.indexOf("--concurrency");
  let concurrency = concIdx !== -1 && args[concIdx + 1] ? parseInt(args[concIdx + 1], 10) : 10;
  if (isNaN(concurrency) || concurrency < 1) concurrency = 10;
  if (concurrency > 10) {
    console.warn(`[WARN] Requested concurrency ${concurrency} exceeds safe ceiling of 10. Clamping to 10.`);
    concurrency = 10;
  }

  console.log("============================================================");
  console.log("PYQVITAP — HARDENED CLOUDFLARE R2 MIGRATION RUNNER");
  console.log(`MODE:            ${isDryRun ? "DRY RUN (READ-ONLY, ZERO R2 WRITES)" : "CONTROLLED EXECUTION"}`);
  console.log(`SCOPE:           ${isRetryFailures ? "RETRY FAILURES ONLY" : limit ? `LIMIT: ${limit} papers` : "FULL DATABASE CORPUS"}`);
  console.log(`CONCURRENCY:     ${concurrency} concurrent workers`);
  console.log(`TIMESTAMP:       ${new Date().toISOString()}`);
  console.log("============================================================\n");

  const mongoUri = process.env.MONGODB_DIRECT_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("Missing MONGODB_URI or MONGODB_DIRECT_URI in environment.");
  }

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME || "pyqvitap-media";

  let s3Client = null;
  if (accountId && accessKeyId && secretAccessKey) {
    s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  } else if (isExecute) {
    throw new Error("R2 credentials missing (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY required).");
  }

  const counters = {
    totalPapersSelected: 0,
    totalMediaTargets: 0,
    skippedAlreadyInR2: 0,
    uploadedToR2: 0,
    wouldUploadDryRun: 0,
    failed: 0,
    retried: 0,
    verified: 0,
    hashMismatches: 0,
  };

  let itemsToProcess = [];

  if (isRetryFailures) {
    console.log("--- LOADING FAILURES FROM PERSISTENT LOG ---");
    const failureList = loadFailures();
    console.log(`Loaded ${failureList.length} failed items from ${FAILURES_FILE_PATH}.\n`);
    if (failureList.length === 0) {
      console.log("No failures found in log. Exiting.");
      return;
    }
    itemsToProcess = failureList.map((f) => ({
      paperId: f.paperId,
      key: f.key,
      url: f.url,
      type: f.type,
      expectedSha256: f.expectedSha256,
      isRetry: true,
    }));
    counters.totalMediaTargets = itemsToProcess.length;
  } else {
    console.log("--- CONNECTING TO MONGODB ---");
    await mongoose.connect(mongoUri);
    const db = mongoose.connection.db;

    const query = {};
    let cursor = db.collection("papers").find(query).sort({ year: -1, subject: 1, _id: 1 });
    if (limit) {
      cursor = cursor.limit(limit);
    }

    const papers = await cursor.toArray();
    await mongoose.disconnect();

    counters.totalPapersSelected = papers.length;
    console.log(`✓ Selected ${papers.length} papers from MongoDB.`);

    for (const p of papers) {
      const paperId = p._id.toString();
      if (p.file_url) {
        itemsToProcess.push({
          paperId,
          key: extractKeyFromUrl(p.file_url, "pdf"),
          url: p.file_url,
          type: "pdf",
          expectedSha256: p.pdf_sha256,
        });
      }
      if (p.thumbnail_url) {
        itemsToProcess.push({
          paperId,
          key: extractKeyFromUrl(p.thumbnail_url, "thumbnail"),
          url: p.thumbnail_url,
          type: "thumbnail",
          expectedSha256: null,
        });
      }
    }
    counters.totalMediaTargets = itemsToProcess.length;
    console.log(`✓ Generated ${itemsToProcess.length} total media targets (PDFs + Thumbnails).\n`);
  }

  console.log("--- BEGINNING PROCESSING PIPELINE ---");

  let currentIndex = 0;

  async function processItem(item, idx) {
    const { paperId, key, url, type, expectedSha256, isRetry } = item;

    if (isRetry) counters.retried++;

    // STEP 1: FAST RESUME / IDEMPOTENCY CHECK
    if (s3Client) {
      try {
        const r2State = await inspectR2Object(s3Client, bucketName, key, expectedSha256);
        if (r2State.exists && r2State.valid) {
          counters.skippedAlreadyInR2++;
          counters.verified++;
          if (isRetry) removeFailure(key, type);
          return;
        }
        if (r2State.exists && !r2State.valid) {
          console.warn(`[REPLACE REQUIRED] ${key}: ${r2State.reason}`);
          counters.hashMismatches++;
        }
      } catch (headErr) {
        console.error(`[HEAD ERROR] ${key}:`, headErr.message);
      }
    }

    // STEP 2: DRY-RUN CHECK
    if (isDryRun) {
      counters.wouldUploadDryRun++;
      return;
    }

    // STEP 3: DOWNLOAD FROM CLOUDINARY WITH RETRY
    let buffer;
    try {
      buffer = await fetchBufferWithRetry(url, 3);
    } catch (fetchErr) {
      counters.failed++;
      recordFailure({
        paperId,
        key,
        url,
        type,
        expectedSha256,
        errorReason: `Download error: ${fetchErr.message}`,
        timestamp: new Date().toISOString(),
      });
      console.error(`[DOWNLOAD FAILED] ${key}: ${fetchErr.message}`);
      return;
    }

    // STEP 4: STRICT INTEGRITY & FORMAT VALIDATION
    const calculatedHash = sha256(buffer);

    if (type === "pdf") {
      const pdfCheck = validatePdf(buffer);
      if (!pdfCheck.valid) {
        counters.failed++;
        recordFailure({
          paperId,
          key,
          url,
          type,
          expectedSha256,
          errorReason: `Corrupt PDF: ${pdfCheck.reason}`,
          timestamp: new Date().toISOString(),
        });
        console.error(`[INVALID PDF] ${key}: ${pdfCheck.reason}`);
        return;
      }

      if (expectedSha256 && calculatedHash.toLowerCase() !== expectedSha256.toLowerCase()) {
        counters.failed++;
        counters.hashMismatches++;
        recordFailure({
          paperId,
          key,
          url,
          type,
          expectedSha256,
          errorReason: `SHA-256 mismatch (Expected: ${expectedSha256}, Got: ${calculatedHash})`,
          timestamp: new Date().toISOString(),
        });
        console.error(`[SHA MISMATCH] ${key}: Expected ${expectedSha256}, calculated ${calculatedHash}`);
        return;
      }
    } else {
      const webpCheck = validateWebp(buffer);
      if (!webpCheck.valid) {
        counters.failed++;
        recordFailure({
          paperId,
          key,
          url,
          type,
          expectedSha256,
          errorReason: `Corrupt Thumbnail: ${webpCheck.reason}`,
          timestamp: new Date().toISOString(),
        });
        console.error(`[INVALID WEBP] ${key}: ${webpCheck.reason}`);
        return;
      }
    }

    // STEP 5: UPLOAD TO R2 WITH METADATA
    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: buffer,
          ContentType: type === "pdf" ? "application/pdf" : "image/webp",
          Metadata: {
            sha256: calculatedHash,
            source: "cloudinary",
            paperId,
          },
        })
      );
      counters.uploadedToR2++;
      counters.verified++;
      removeFailure(key, type);
    } catch (putErr) {
      counters.failed++;
      recordFailure({
        paperId,
        key,
        url,
        type,
        expectedSha256,
        errorReason: `R2 upload error: ${putErr.message}`,
        timestamp: new Date().toISOString(),
      });
      console.error(`[UPLOAD FAILED] ${key}: ${putErr.message}`);
    }
  }

  async function worker() {
    while (currentIndex < itemsToProcess.length) {
      const idx = currentIndex++;
      const item = itemsToProcess[idx];
      await processItem(item, idx + 1);

      // Periodic progress heartbeat every 100 items
      if (idx > 0 && idx % 100 === 0) {
        console.log(`[PROGRESS] Processed ${idx}/${itemsToProcess.length} items (Skipped: ${counters.skippedAlreadyInR2}, Uploaded: ${counters.uploadedToR2}, Failed: ${counters.failed})`);
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, itemsToProcess.length) }, () => worker());
  await Promise.all(workers);

  const summary = {
    mode: isDryRun ? "DRY_RUN" : "EXECUTE",
    totalPapersSelected: counters.totalPapersSelected,
    totalMediaTargets: counters.totalMediaTargets,
    skippedAlreadyInR2: counters.skippedAlreadyInR2,
    uploadedToR2: counters.uploadedToR2,
    wouldUploadDryRun: counters.wouldUploadDryRun,
    failed: counters.failed,
    retried: counters.retried,
    verified: counters.verified,
    hashMismatches: counters.hashMismatches,
    activeFailuresRemaining: loadFailures().length,
    timestamp: new Date().toISOString(),
  };

  console.log("\n============================================================");
  console.log("FINAL MIGRATION SUMMARY (MACHINE READABLE)");
  console.log("============================================================");
  console.log(JSON.stringify(summary, null, 2));
  console.log("============================================================\n");
}

if (require.main === module) {
  run().catch((err) => {
    console.error("Fatal migration script error:", err);
    process.exit(1);
  });
}

module.exports = {
  validatePdf,
  validateWebp,
  extractKeyFromUrl,
  inspectR2Object,
  recordFailure,
  loadFailures,
  saveFailures,
  removeFailure,
  fetchBufferWithRetry,
  sha256,
  FAILURES_FILE_PATH,
};

