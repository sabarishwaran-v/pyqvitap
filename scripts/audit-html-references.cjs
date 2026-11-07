// @ts-nocheck
const fs = require("fs");

const content = fs.readFileSync("src/middleware.ts", "utf8");
const match = content.match(/const MAINTENANCE_HTML = `([\s\S]*?)`;/);
if (!match || !match[1]) {
  console.error("Could not find MAINTENANCE_HTML");
  process.exit(1);
}
const html = match[1];

const checks = [
  { name: "localhost URLs", regex: /localhost/i },
  { name: "Cloudinary URLs", regex: /res\.cloudinary\.com/i },
  { name: "R2 / S3 URLs", regex: /(?:r2\.cloudflarestorage\.com|s3\.[a-z0-9\-]+\.amazonaws\.com)/i },
  { name: "Accidental PyqVitAp Vercel URLs", regex: /pyqvitap\.vercel\.app/i },
  { name: "Secrets or API keys", regex: /(?:sk_test_|pk_test_|CLERK_SECRET|AWS_SECRET|MONGODB_URI|secret|api_key)/i },
  { name: "External scripts / stylesheets", regex: /<(?:script|link)[^>]*(?:src|href)=["']https?:\/\//i }
];

console.log("=== MAINTENANCE HTML REFERENCE AUDIT ===");
let hasIssues = false;
for (const check of checks) {
  const m = html.match(check.regex);
  if (m) {
    console.log(`[ALERT] Found match for ${check.name}:`, m[0]);
    hasIssues = true;
  } else {
    console.log(`[PASS] No ${check.name} found.`);
  }
}

// Enumerate all external links
const allExternal = html.match(/https?:\/\/[^\s"'\)]+/g) || [];
console.log("\nAll External Links in MAINTENANCE_HTML:");
allExternal.forEach(u => console.log(" - " + u));

// Validate that external links are ONLY safe public links:
// 1. https://github.com/sabarishwaran-v/pyqvitap
// 2. https://ffcsmate.vercel.app
// 3. https://github.com/sabarishwaran-v
const allowedExternal = new Set([
  "https://github.com/sabarishwaran-v/pyqvitap",
  "https://ffcsmate.vercel.app",
  "https://github.com/sabarishwaran-v"
]);

for (const ext of allExternal) {
  if (!allowedExternal.has(ext)) {
    console.error(`[UNEXPECTED EXTERNAL URL]: ${ext}`);
    hasIssues = true;
  }
}

console.log("\nReference Audit Result:", hasIssues ? "FAIL" : "PASS");
if (hasIssues) process.exit(1);
