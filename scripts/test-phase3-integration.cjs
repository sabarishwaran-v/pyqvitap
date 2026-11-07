// @ts-nocheck
/**
 * Phase 3 Media Gateway Integration & Mixed Storage Test Suite
 */

const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const mongoose = require("mongoose");
const JSZip = require("jszip");
const { S3Client, GetObjectCommand, ListObjectsV2Command } = require("@aws-sdk/client-s3");

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

async function run() {
  console.log("============================================================");
  console.log("PHASE 3: MEDIA GATEWAY INTEGRATION & MIXED STORAGE TEST SUITE");
  console.log("============================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✓ ${message}`);
      passedTests++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      throw new Error(`Test failed: ${message}`);
    }
  }

  // --- PART 1: Media Gateway Resolver Unit Tests ---
  console.log("--- 1. Testing Media Gateway URL Resolver ---");
  const mediaTs = fs.readFileSync("src/lib/utils/media.ts", "utf8");
  const mediaJs = ts.transpileModule(mediaTs, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;

  const tmpMedia = path.resolve(__dirname, ".tmp-media.cjs");
  fs.writeFileSync(tmpMedia, mediaJs);
  const { getMediaGatewayUrl } = require(tmpMedia);

  const testPdfUrl = "https://res.cloudinary.com/bkja3mef/raw/upload/v1789060268/papers/pdfs/TEST_123.pdf";
  assert(
    getMediaGatewayUrl(testPdfUrl) === "/api/media/papers/pdfs/TEST_123.pdf",
    "Maps Cloudinary PDF URL to /api/media/papers/pdfs/TEST_123.pdf"
  );

  const testThumbUrl = "https://res.cloudinary.com/bkja3mef/image/upload/v1789060269/papers/thumbnails/TEST_123_thumb.webp";
  assert(
    getMediaGatewayUrl(testThumbUrl) === "/api/media/papers/thumbnails/TEST_123_thumb.webp",
    "Maps Cloudinary thumbnail URL to /api/media/papers/thumbnails/TEST_123_thumb.webp"
  );

  const testUnapproved = "https://res.cloudinary.com/bkja3mef/raw/upload/v12345/papers/unapproved/unapp_999.pdf";
  assert(
    getMediaGatewayUrl(testUnapproved) === "/api/media/papers/unapproved/unapp_999.pdf",
    "Maps unapproved PDF to /api/media/papers/unapproved/unapp_999.pdf"
  );

  const testExistingGateway = "/api/media/papers/pdfs/already.pdf";
  assert(
    getMediaGatewayUrl(testExistingGateway) === "/api/media/papers/pdfs/already.pdf",
    "Preserves already resolved /api/media/ path"
  );

  const testExternal = "https://example.com/other.pdf";
  assert(
    getMediaGatewayUrl(testExternal) === "https://example.com/other.pdf",
    "Falls back cleanly to safe original URL for non-media external links"
  );

  fs.unlinkSync(tmpMedia);

  // --- PART 2: Mixed Storage Live Execution Tests ---
  console.log("\n--- 2. Testing Mixed Storage against Live Media Gateway ---");

  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });

  const realR2Bucket = {
    async get(key) {
      try {
        const res = await s3.send(new GetObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME || "pyqvitap-media",
          Key: key,
        }));
        return {
          body: res.Body,
          size: res.ContentLength,
          httpMetadata: { contentType: res.ContentType },
          httpEtag: res.ETag,
          uploaded: res.LastModified,
        };
      } catch (err) {
        if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
          return null;
        }
        throw err;
      }
    }
  };

  let routeTs = fs.readFileSync("src/app/api/media/[...path]/route.ts", "utf8");
  routeTs = routeTs.replace(
    /import\s+\{\s*getCloudflareContext\s*\}\s*from\s*["'"]@opennextjs\/cloudflare["'"];/,
    `function getCloudflareContext() { return { env: { R2_MEDIA: globalThis.__testR2Bucket } }; }`
  );
  routeTs = routeTs.replace(
    /import\s+\{\s*isAuthEnabled,\s*isAuthorizedEmail\s*\}\s*from\s*["']@\/config\/auth["'];/,
    `async function isAuthEnabled() { return false; } function isAuthorizedEmail() { return true; }`
  );
  routeTs = routeTs.replace(
    /import\s+\{\s*auth,\s*createClerkClient\s*\}\s*from\s*["']@clerk\/nextjs\/server["'];/,
    `async function auth() { return { userId: null }; } function createClerkClient() {}`
  );
  routeTs = routeTs.replace(
    /import\s+\{\s*isCloudinaryFallbackEnabled\s*\}\s*from\s*["']@\/config\/media["'];/,
    `async function isCloudinaryFallbackEnabled() { return process.env.CLOUDINARY_FALLBACK_ENABLED === "true"; }`
  );
  const routeJs = ts.transpileModule(routeTs, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;

  const tmpRoute = path.resolve(__dirname, ".tmp-route.cjs");
  fs.writeFileSync(tmpRoute, routeJs);
  globalThis.__testR2Bucket = realR2Bucket;
  const { GET } = require(tmpRoute);

  // Test A: R2 Migrated PDF
  const r2PdfKey = ["papers", "pdfs", "CHY4307_2025-26_CAT1_a4018b60.pdf"];
  const resR2Pdf = await GET(
    new Request("https://pyqvitap.site/api/media/" + r2PdfKey.join("/")),
    { params: { path: r2PdfKey } }
  );
  assert(resR2Pdf.status === 200, "R2 Migrated PDF returns status 200");
  assert(resR2Pdf.headers.get("content-type") === "application/pdf", "R2 Migrated PDF has Content-Type: application/pdf");
  assert(resR2Pdf.headers.get("cache-control") === "private, no-store", "R2 Migrated PDF strictly enforces private, no-store");
  const r2PdfBuf = Buffer.from(await resR2Pdf.arrayBuffer());
  assert(r2PdfBuf.slice(0, 5).toString("utf8").startsWith("%PDF"), "R2 Migrated PDF starts with %PDF magic bytes");

  // Test B: R2 Migrated Thumbnail
  const r2ThumbKey = ["papers", "thumbnails", "CHY4307_2025-26_CAT1_a4018b60_thumb.webp"];
  const resR2Thumb = await GET(
    new Request("https://pyqvitap.site/api/media/" + r2ThumbKey.join("/")),
    { params: { path: r2ThumbKey } }
  );
  assert(resR2Thumb.status === 200, "R2 Migrated Thumbnail returns status 200");
  assert(resR2Thumb.headers.get("content-type") === "image/webp", "R2 Migrated Thumbnail has Content-Type: image/webp");
  const r2ThumbBuf = Buffer.from(await resR2Thumb.arrayBuffer());
  assert(
    r2ThumbBuf.slice(0, 4).toString("utf8") === "RIFF" && r2ThumbBuf.slice(8, 12).toString("utf8") === "WEBP",
    "R2 Migrated Thumbnail contains valid RIFF...WEBP header"
  );

  // Test C: Unmigrated Cloudinary PDF (fallback)
  await mongoose.connect(process.env.MONGODB_URI);
  const unmigratedDoc = await mongoose.connection.db.collection("papers").findOne({
    subject: { $regex: /CHY1001/i },
    year: { $ne: "2025-26" }
  });
  await mongoose.disconnect();

  assert(!!unmigratedDoc, "Found an unmigrated paper in MongoDB");
  const unmigratedPdfKey = unmigratedDoc.file_url.match(/papers\/pdfs\/.+\.pdf$/)[0];
  const cldPdfKey = unmigratedPdfKey.split("/");

  process.env.CLOUDINARY_FALLBACK_ENABLED = "true";
  const resCldPdf = await GET(
    new Request("https://pyqvitap.site/api/media/" + unmigratedPdfKey),
    { params: { path: cldPdfKey } }
  );
  process.env.CLOUDINARY_FALLBACK_ENABLED = "false";
  assert(resCldPdf.status === 200, "Unmigrated Cloudinary PDF fallback returns status 200");
  assert(resCldPdf.headers.get("content-type") === "application/pdf", "Unmigrated Cloudinary PDF has Content-Type: application/pdf");
  assert(resCldPdf.headers.get("cache-control") === "private, no-store", "Unmigrated Cloudinary PDF enforces private, no-store");
  const cldPdfBuf = Buffer.from(await resCldPdf.arrayBuffer());
  assert(cldPdfBuf.slice(0, 5).toString("utf8").startsWith("%PDF"), "Unmigrated Cloudinary PDF starts with %PDF magic bytes");

  // Test D: Nonexistent Object
  const resNonExistent = await GET(
    new Request("https://pyqvitap.site/api/media/papers/pdfs/non_existent_paper_99999.pdf"),
    { params: { path: ["papers", "pdfs", "non_existent_paper_99999.pdf"] } }
  );
  assert(resNonExistent.status === 404, "Nonexistent object returns 404");

  // --- PART 3: Mixed Storage ZIP Bulk Download Test ---
  console.log("\n--- 3. Testing Mixed Storage ZIP Bulk Download Simulation ---");

  // Compile watermark utility
  const wmTs = fs.readFileSync("src/lib/utils/pdfWatermark.ts", "utf8");
  const wmJs = ts.transpileModule(wmTs, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const tmpWm = path.resolve(__dirname, ".tmp-wm.cjs");
  fs.writeFileSync(tmpWm, wmJs);
  const { applyWatermarkAndDisclaimer } = require(tmpWm);

  // Apply watermark to R2 PDF
  const watermarkedR2Bytes = await applyWatermarkAndDisclaimer(
    r2PdfBuf,
    "R2-Migrated-Paper.pdf",
    "/api/media/" + r2PdfKey.join("/")
  );
  assert(Buffer.from(watermarkedR2Bytes).slice(0, 5).toString("utf8").startsWith("%PDF"), "R2 watermarked PDF has valid %PDF header");

  // Apply watermark to Cloudinary fallback PDF
  const watermarkedCldBytes = await applyWatermarkAndDisclaimer(
    cldPdfBuf,
    "Cloudinary-Fallback-Paper.pdf",
    "/api/media/" + unmigratedPdfKey
  );
  assert(Buffer.from(watermarkedCldBytes).slice(0, 5).toString("utf8").startsWith("%PDF"), "Cloudinary watermarked PDF has valid %PDF header");

  // Bundle into a single ZIP archive
  const zip = new JSZip();
  zip.file("CHY4307-CAT1-2025-26.pdf", watermarkedR2Bytes);
  zip.file("CHY1001-FAT-2021-22.pdf", watermarkedCldBytes);

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  assert(zipBuffer.length > 50000, `Generated valid ZIP containing mixed storage papers (${zipBuffer.length} bytes)`);

  // Verify contents of the generated ZIP
  const parsedZip = await JSZip.loadAsync(zipBuffer);
  const zipFiles = Object.keys(parsedZip.files);
  assert(zipFiles.includes("CHY4307-CAT1-2025-26.pdf"), "ZIP contains R2-backed PDF");
  assert(zipFiles.includes("CHY1001-FAT-2021-22.pdf"), "ZIP contains Cloudinary-backed PDF");

  const unzippedR2 = await parsedZip.file("CHY4307-CAT1-2025-26.pdf").async("nodebuffer");
  const unzippedCld = await parsedZip.file("CHY1001-FAT-2021-22.pdf").async("nodebuffer");
  assert(unzippedR2.slice(0, 5).toString("utf8").startsWith("%PDF"), "Extracted R2 PDF in ZIP is valid %PDF");
  assert(unzippedCld.slice(0, 5).toString("utf8").startsWith("%PDF"), "Extracted Cloudinary PDF in ZIP is valid %PDF");

  fs.unlinkSync(tmpRoute);
  fs.unlinkSync(tmpWm);

  // --- PART 4: Verification of Bucket Safety & Count ---
  console.log("\n--- 4. Checking R2 Object Count Baseline Post-Test ---");
  let totalCount = 0;
  let token = undefined;
  do {
    const listRes = await s3.send(new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME || "pyqvitap-media",
      ContinuationToken: token,
    }));
    if (listRes.Contents) {
      totalCount += listRes.Contents.length;
    }
    token = listRes.IsTruncated ? listRes.NextContinuationToken : undefined;
  } while (token);

  assert(totalCount === 10140, `R2 object count remains EXACTLY 10,140 (actual = ${totalCount})`);

  console.log("\n============================================================");
  console.log(`TEST SUMMARY: ALL ${passedTests}/${totalTests} TESTS PASSED (100%)`);
  console.log("============================================================\n");
}

run().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
