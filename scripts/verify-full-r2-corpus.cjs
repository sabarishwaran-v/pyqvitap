// @ts-nocheck
/**
 * PyqVitAp — Independent Full R2 Corpus Verification Suite
 * Verifies 100% of the Cloudflare R2 corpus against the MongoDB source of truth.
 * Read-only: 0 writes, 0 deletes, 0 mutations.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");
const { S3Client, ListObjectsV2Command, HeadObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");

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
        if (val.startsWith("\"")) {
          const closingIdx = val.indexOf("\"", 1);
          if (closingIdx !== -1) val = val.substring(1, closingIdx);
        } else if (val.startsWith("\x27")) {
          const closingIdx = val.indexOf("\x27", 1);
          if (closingIdx !== -1) val = val.substring(1, closingIdx);
        } else {
          val = val.split("#")[0].trim();
        }
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}
loadEnv();

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function extractKeyFromUrl(url, type) {
  try {
    const u = new URL(url);
    const match = u.pathname.match(/\/(?:raw|image)\/upload\/(?:v\d+\/)?(papers\/.+)$/);
    if (match && match[1]) return match[1];
    const filename = path.basename(u.pathname);
    return type === "pdf" ? `papers/pdfs/${filename}` : `papers/thumbnails/${filename}`;
  } catch {
    const filename = path.basename(url);
    return type === "pdf" ? `papers/pdfs/${filename}` : `papers/thumbnails/${filename}`;
  }
}

async function streamToBuffer(stream) {
  if (stream && typeof stream.transformToByteArray === "function") {
    const bytes = await stream.transformToByteArray();
    return Buffer.from(bytes);
  }
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

async function verifyCorpus() {
  console.log("============================================================");
  console.log("PYQVITAP — INDEPENDENT FULL R2 CORPUS VERIFICATION");
  console.log("MODE: READ-ONLY (ZERO WRITES, ZERO DELETIONS)");
  console.log(`TIMESTAMP: ${new Date().toISOString()}`);
  console.log("============================================================\n");

  const mongoUri = process.env.MONGODB_DIRECT_URI || process.env.MONGODB_URI;
  if (!mongoUri) throw new Error("Missing MONGODB_URI");

  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    }
  });
  const bucketName = process.env.R2_BUCKET_NAME || "pyqvitap-media";

  // 1. BUILD EXPECTED MANIFEST FROM MONGODB
  console.log("--- 1. BUILDING EXPECTED MANIFEST FROM MONGODB ---");
  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;
  const papers = await db.collection("papers").find({}).sort({ year: -1, subject: 1, _id: 1 }).toArray();
  await mongoose.disconnect();

  console.log(`✓ Fetched ${papers.length} papers from MongoDB.`);

  const expectedManifest = [];
  const expectedKeysMap = new Map();

  for (const p of papers) {
    const paperId = p._id.toString();
    if (p.file_url) {
      const key = extractKeyFromUrl(p.file_url, "pdf");
      const item = {
        paperId,
        key,
        type: "pdf",
        expectedSha256: p.pdf_sha256,
        sourceUrl: p.file_url,
        subject: p.subject,
        year: p.year,
        examType: p.exam_type,
      };
      expectedManifest.push(item);
      expectedKeysMap.set(key, item);
    }
    if (p.thumbnail_url) {
      const key = extractKeyFromUrl(p.thumbnail_url, "thumbnail");
      const item = {
        paperId,
        key,
        type: "thumbnail",
        expectedSha256: null,
        sourceUrl: p.thumbnail_url,
        subject: p.subject,
        year: p.year,
        examType: p.exam_type,
      };
      expectedManifest.push(item);
      expectedKeysMap.set(key, item);
    }
  }

  const expectedPdfCount = expectedManifest.filter((m) => m.type === "pdf").length;
  const expectedThumbCount = expectedManifest.filter((m) => m.type === "thumbnail").length;

  console.log(`✓ Total expected media keys: ${expectedManifest.length}`);
  console.log(`  - Expected PDFs: ${expectedPdfCount}`);
  console.log(`  - Expected Thumbnails: ${expectedThumbCount}`);
  console.log(`  - Unique keys in map: ${expectedKeysMap.size}`);

  if (expectedKeysMap.size !== expectedManifest.length) {
    throw new Error(`Key collision detected! Manifest has ${expectedManifest.length} items but only ${expectedKeysMap.size} unique keys.`);
  }

  // 2. INDEPENDENT R2 LIST
  console.log("\n--- 2. INDEPENDENT PAGINATED R2 INVENTORY LISTING ---");
  let token = undefined;
  const r2Inventory = [];
  const r2KeysSet = new Set();
  let r2Pdfs = 0;
  let r2Thumbs = 0;
  let unexpectedObjects = [];

  do {
    const res = await s3.send(new ListObjectsV2Command({
      Bucket: bucketName,
      ContinuationToken: token,
    }));
    if (res.Contents) {
      for (const obj of res.Contents) {
        r2Inventory.push(obj);
        r2KeysSet.add(obj.Key);
        if (obj.Key.startsWith("papers/pdfs/")) r2Pdfs++;
        else if (obj.Key.startsWith("papers/thumbnails/")) r2Thumbs++;
        else unexpectedObjects.push(obj.Key);

        if (!expectedKeysMap.has(obj.Key)) {
          if (!unexpectedObjects.includes(obj.Key)) unexpectedObjects.push(obj.Key);
        }
      }
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);

  console.log(`✓ Total R2 objects listed: ${r2Inventory.length}`);
  console.log(`  - R2 PDFs: ${r2Pdfs}`);
  console.log(`  - R2 Thumbnails: ${r2Thumbs}`);
  console.log(`  - Unexpected objects: ${unexpectedObjects.length}`);

  const missingExpectedObjects = [];
  for (const item of expectedManifest) {
    if (!r2KeysSet.has(item.key)) {
      missingExpectedObjects.push(item.key);
    }
  }
  console.log(`  - Missing expected objects: ${missingExpectedObjects.length}`);

  // 3. FULL METADATA VERIFICATION VIA HEADOBJECT
  console.log("\n--- 3. FULL METADATA VERIFICATION VIA HEADOBJECT (10,140 OBJECTS) ---");
  const concurrency = 25;
  let cursor = 0;
  let verifiedPdfMetadata = 0;
  let verifiedThumbMetadata = 0;
  const metadataDiscrepancies = [];

  async function metadataWorker() {
    while (cursor < expectedManifest.length) {
      const idx = cursor++;
      const item = expectedManifest[idx];
      const { key, type, expectedSha256, paperId } = item;

      try {
        const head = await s3.send(new HeadObjectCommand({ Bucket: bucketName, Key: key }));
        const size = head.ContentLength || 0;
        const contentType = head.ContentType;
        const metaSha = head.Metadata?.sha256;
        const metaSource = head.Metadata?.source;
        const metaPaperId = head.Metadata?.paperid;

        if (size <= 0) {
          metadataDiscrepancies.push({ key, issue: "Zero byte object" });
          continue;
        }

        if (type === "pdf") {
          const typeMatch = contentType === "application/pdf";
          const shaMatch = metaSha && expectedSha256 && metaSha.toLowerCase() === expectedSha256.toLowerCase();

          if (!typeMatch) {
            metadataDiscrepancies.push({ key, issue: `ContentType mismatch: expected application/pdf, got ${contentType}` });
          } else if (!shaMatch) {
            metadataDiscrepancies.push({ key, issue: `SHA256 mismatch: expected ${expectedSha256}, got ${metaSha}` });
          } else {
            verifiedPdfMetadata++;
          }
        } else {
          const typeMatch = contentType === "image/webp";
          const hasSha = Boolean(metaSha && metaSha.length === 64);
          const sourceMatch = metaSource === "cloudinary";
          const paperIdMatch = metaPaperId === paperId;

          if (!typeMatch) {
            metadataDiscrepancies.push({ key, issue: `ContentType mismatch: expected image/webp, got ${contentType}` });
          } else if (!hasSha) {
            metadataDiscrepancies.push({ key, issue: `Missing or invalid thumbnail sha256 metadata: ${metaSha}` });
          } else if (!sourceMatch) {
            metadataDiscrepancies.push({ key, issue: `Metadata source mismatch: ${metaSource}` });
          } else if (!paperIdMatch) {
            metadataDiscrepancies.push({ key, issue: `Metadata paperId mismatch: expected ${paperId}, got ${metaPaperId}` });
          } else {
            verifiedThumbMetadata++;
          }
        }
      } catch (err) {
        metadataDiscrepancies.push({ key, issue: `HeadObject failed: ${err.message}` });
      }

      if (idx > 0 && idx % 2000 === 0) {
        console.log(`[PROGRESS] Verified ${idx}/${expectedManifest.length} metadata records...`);
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => metadataWorker());
  await Promise.all(workers);

  console.log(`✓ Metadata verification complete:`);
  console.log(`  - PDFs verified: ${verifiedPdfMetadata} / ${expectedPdfCount}`);
  console.log(`  - Thumbnails verified: ${verifiedThumbMetadata} / ${expectedThumbCount}`);
  console.log(`  - Discrepancies: ${metadataDiscrepancies.length}`);

  // 4. STATISTICAL CONTENT SAMPLE VERIFICATION (FULL DOWNLOAD)
  console.log("\n--- 4. DETERMINISTIC CONTENT SAMPLE VERIFICATION (FULL DOWNLOAD) ---");
  // Select every 50th PDF and every 50th thumbnail deterministically across the collection
  const pdfSample = expectedManifest.filter((m) => m.type === "pdf").filter((_, i) => i % 50 === 0);
  const thumbSample = expectedManifest.filter((m) => m.type === "thumbnail").filter((_, i) => i % 50 === 0);

  console.log(`Selected sample: ${pdfSample.length} PDFs, ${thumbSample.length} Thumbnails.`);

  let samplePdfsPassed = 0;
  const samplePdfFailures = [];
  let pdfIdx = 0;

  async function pdfSampleWorker() {
    while (pdfIdx < pdfSample.length) {
      const idx = pdfIdx++;
      const item = pdfSample[idx];
      try {
        const getRes = await s3.send(new GetObjectCommand({ Bucket: bucketName, Key: item.key }));
        const buf = await streamToBuffer(getRes.Body);

        const headerValid = buf.slice(0, 5).toString("utf8").startsWith("%PDF");
        const searchWin = Math.min(buf.length, 2048);
        const tail = buf.slice(buf.length - searchWin).toString("latin1");
        const eofValid = tail.includes("%%EOF");
        const actualSha = sha256(buf);
        const shaValid = actualSha.toLowerCase() === item.expectedSha256.toLowerCase();

        if (headerValid && eofValid && shaValid) {
          samplePdfsPassed++;
        } else {
          samplePdfFailures.push({ key: item.key, headerValid, eofValid, shaValid });
        }
      } catch (err) {
        samplePdfFailures.push({ key: item.key, error: err.message });
      }
    }
  }
  await Promise.all(Array.from({ length: 10 }, () => pdfSampleWorker()));

  let sampleThumbsPassed = 0;
  const sampleThumbFailures = [];
  let thumbIdx = 0;

  async function thumbSampleWorker() {
    while (thumbIdx < thumbSample.length) {
      const idx = thumbIdx++;
      const item = thumbSample[idx];
      try {
        const getRes = await s3.send(new GetObjectCommand({ Bucket: bucketName, Key: item.key }));
        const metaSha = getRes.Metadata?.sha256;
        const buf = await streamToBuffer(getRes.Body);

        const isRiff = buf.slice(0, 4).toString("utf8") === "RIFF";
        const isWebp = buf.slice(8, 12).toString("utf8") === "WEBP";
        const actualSha = sha256(buf);
        const shaValid = metaSha ? actualSha.toLowerCase() === metaSha.toLowerCase() : true;

        if (isRiff && isWebp && shaValid) {
          sampleThumbsPassed++;
        } else {
          sampleThumbFailures.push({ key: item.key, isRiff, isWebp, shaValid });
        }
      } catch (err) {
        sampleThumbFailures.push({ key: item.key, error: err.message });
      }
    }
  }
  await Promise.all(Array.from({ length: 10 }, () => thumbSampleWorker()));

  console.log(`✓ Full-body PDF sample verification: ${samplePdfsPassed}/${pdfSample.length} passed.`);
  if (samplePdfFailures.length > 0) {
    console.error("  Sample PDF failures:", samplePdfFailures);
  }

  console.log(`✓ Full-body Thumbnail sample verification: ${sampleThumbsPassed}/${thumbSample.length} passed.`);
  if (sampleThumbFailures.length > 0) {
    console.error("  Sample Thumbnail failures:", sampleThumbFailures);
  }

  // SUMMARY JSON
  const summary = {
    expectedManifest: {
      totalPapers: papers.length,
      expectedTotalKeys: expectedManifest.length,
      expectedPdfKeys: expectedPdfCount,
      expectedThumbnailKeys: expectedThumbCount,
      keysAreUnique: expectedKeysMap.size === expectedManifest.length,
    },
    r2ActualInventory: {
      totalObjects: r2Inventory.length,
      pdfObjects: r2Pdfs,
      thumbnailObjects: r2Thumbs,
      unexpectedObjectsCount: unexpectedObjects.length,
      missingExpectedCount: missingExpectedObjects.length,
    },
    metadataVerification: {
      pdfMetadataVerified: verifiedPdfMetadata,
      thumbnailMetadataVerified: verifiedThumbMetadata,
      totalMetadataVerified: verifiedPdfMetadata + verifiedThumbMetadata,
      discrepanciesCount: metadataDiscrepancies.length,
    },
    fullBodyContentSample: {
      pdfSampleTotal: pdfSample.length,
      pdfSamplePassed: samplePdfsPassed,
      thumbSampleTotal: thumbSample.length,
      thumbSamplePassed: sampleThumbsPassed,
      totalSampleTested: pdfSample.length + thumbSample.length,
      totalSamplePassed: samplePdfsPassed + sampleThumbsPassed,
    },
    timestamp: new Date().toISOString(),
  };

  console.log("\n============================================================");
  console.log("FINAL INDEPENDENT VERIFICATION AUDIT DATA (MACHINE READABLE)");
  console.log("============================================================");
  console.log(JSON.stringify(summary, null, 2));
  console.log("============================================================\n");
}

verifyCorpus().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
