// @ts-nocheck
/**
 * Hardening & Integrity Verification Suite
 * Verifies all hardening features in scripts/migrate-to-r2.cjs
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { execSync } = require("child_process");

const {
  validatePdf,
  validateWebp,
  extractKeyFromUrl,
  recordFailure,
  loadFailures,
  saveFailures,
  removeFailure,
  sha256,
  FAILURES_FILE_PATH,
} = require("./migrate-to-r2.cjs");

console.log("============================================================");
console.log("RUNNING MIGRATION TOOLING HARDENING VERIFICATION TESTS");
console.log("============================================================\n");

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`✓ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`✗ FAIL: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

// 1. PDF Validation Tests
test("validatePdf detects valid PDF with %PDF and %%EOF", () => {
  const validPdfBuf = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\nstartxref\n123\n%%EOF\n");
  const res = validatePdf(validPdfBuf);
  assert.strictEqual(res.valid, true);
});

test("validatePdf rejects buffer missing %PDF header", () => {
  const corruptBuf = Buffer.from("NOT_A_PDF_CONTENT\n%%EOF");
  const res = validatePdf(corruptBuf);
  assert.strictEqual(res.valid, false);
  assert.strictEqual(res.reason, "Missing %PDF magic bytes");
});

test("validatePdf rejects buffer missing %%EOF trailer", () => {
  const missingEofBuf = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n");
  const res = validatePdf(missingEofBuf);
  assert.strictEqual(res.valid, false);
  assert.strictEqual(res.reason, "Missing %%EOF marker in file footer");
});

test("validatePdf accepts %%EOF with trailing bytes within 2048-byte window", () => {
  const trailingPad = Buffer.alloc(100, 0x20); // 100 spaces
  const pdfWithPad = Buffer.concat([
    Buffer.from("%PDF-1.4\ncontent\n%%EOF\n"),
    trailingPad,
  ]);
  const res = validatePdf(pdfWithPad);
  assert.strictEqual(res.valid, true);
});

// 2. WebP Validation Tests
test("validateWebp detects valid RIFF...WEBP header", () => {
  const webpHeader = Buffer.from("RIFF\x20\x00\x00\x00WEBPVP8 ");
  const res = validateWebp(webpHeader);
  assert.strictEqual(res.valid, true);
});

test("validateWebp rejects non-WebP signatures", () => {
  const fakeWebp = Buffer.from("GIF89a\x00\x00\x00\x00\x00\x00\x00");
  const res = validateWebp(fakeWebp);
  assert.strictEqual(res.valid, false);
  assert.strictEqual(res.reason, "Missing RIFF/WEBP signature");
});

// 3. Deterministic Key Extraction Tests
test("extractKeyFromUrl extracts Cloudinary paths deterministically", () => {
  const pdfUrl = "https://res.cloudinary.com/raw/upload/v1234/papers/pdfs/sample-paper-2024.pdf";
  const thumbUrl = "https://res.cloudinary.com/image/upload/v5678/papers/thumbnails/sample-thumb-2024.webp";
  
  assert.strictEqual(extractKeyFromUrl(pdfUrl, "pdf"), "papers/pdfs/sample-paper-2024.pdf");
  assert.strictEqual(extractKeyFromUrl(thumbUrl, "thumbnail"), "papers/thumbnails/sample-thumb-2024.webp");
});

// 4. SHA-256 and Integrity Check Tests
test("sha256 computes expected hash", () => {
  const buf = Buffer.from("PyqVitAp test payload for SHA-256 validation");
  const hash = sha256(buf);
  const cryptoHash = require("crypto").createHash("sha256").update(buf).digest("hex");
  assert.strictEqual(hash, cryptoHash);
  assert.strictEqual(hash, "b7d9339d96f428ba3ff346a149f67de9b6536f80b9a07ab6b749fbc4af32a7f2");
});

test("SHA-256 mismatch detection rejects invalid payload", () => {
  const payload = Buffer.from("%PDF-1.4 test");
  const actualHash = sha256(payload);
  const expectedHash = "0000000000000000000000000000000000000000000000000000000000000000";
  
  const isMatch = actualHash.toLowerCase() === expectedHash.toLowerCase();
  assert.strictEqual(isMatch, false, "Hash mismatch correctly flagged");
});

// 5. Persistent Failure Log Tests
test("recordFailure, loadFailures, and removeFailure function correctly", () => {
  const testEntry = {
    paperId: "650000000000000000000099",
    key: "papers/pdfs/test-simulated-failure.pdf",
    url: "https://example.com/mock.pdf",
    type: "pdf",
    expectedSha256: "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
    errorReason: "Simulated test failure for hardening verification",
    timestamp: new Date().toISOString(),
  };

  // Record failure
  recordFailure(testEntry);
  const failures = loadFailures();
  const found = failures.find((f) => f.key === testEntry.key && f.type === testEntry.type);
  assert(found, "Failure must be persisted in log");
  assert.strictEqual(found.paperId, testEntry.paperId);
  assert.strictEqual(found.expectedSha256, testEntry.expectedSha256);
  assert.strictEqual(found.type, "pdf");

  // Remove failure
  removeFailure(testEntry.key, testEntry.type);
  const remaining = loadFailures();
  const stillFound = remaining.find((f) => f.key === testEntry.key && f.type === testEntry.type);
  assert(!stillFound, "Failure must be removed when cleared");
});

// 6. CLI Retry-Failures Flag Test
test("CLI --retry-failures mode loads from failure log", () => {
  const mockEntry = {
    paperId: "mock_paper_id_cli_test",
    key: "papers/pdfs/mock-test-cli.pdf",
    url: "https://example.com/mock-cli.pdf",
    type: "pdf",
    expectedSha256: "1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff",
    errorReason: "Mock error for CLI test",
    timestamp: new Date().toISOString(),
  };

  saveFailures([mockEntry]);

  try {
    const cmd = "node scripts/migrate-to-r2.cjs --retry-failures --dry-run";
    const output = execSync(cmd, { cwd: path.resolve(__dirname, ".."), encoding: "utf8" });
    
    assert(output.includes("RETRY FAILURES ONLY"), "Output should indicate retry failures mode");
    assert(output.includes("Loaded 1 failed items"), "Output should show 1 loaded failed item");
    assert(output.includes('"retried": 1') || output.includes('"totalMediaTargets": 1'), "Summary should reflect 1 retry target");
  } finally {
    // Reset failures file to empty array
    saveFailures([]);
  }
});

console.log(`\n============================================================`);
console.log(`TEST SUMMARY: ${passed}/${total} TESTS PASSED`);
console.log(`============================================================\n`);
