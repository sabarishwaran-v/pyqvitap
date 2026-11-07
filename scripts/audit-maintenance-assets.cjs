// @ts-nocheck
const fs = require("fs");
const path = require("path");

const content = fs.readFileSync("src/middleware.ts", "utf8");
const match = content.match(/const MAINTENANCE_HTML = `([\s\S]*?)`;/);
if (!match || !match[1]) {
  console.error("Could not find MAINTENANCE_HTML");
  process.exit(1);
}
const html = match[1];

// Find all URLs/paths starting with / or quotes
const assetRegex = /(?:href|src|url)\(["']?(\/[^"'\)\s]+)["']?\)/g;
const srcHrefRegex = /(?:href|src)=["'](\/[^"'\s]+)["']/g;

const found = new Set();
let m;
while ((m = assetRegex.exec(html)) !== null) found.add(m[1].split("?")[0]);
while ((m = srcHrefRegex.exec(html)) !== null) found.add(m[1].split("?")[0]);

// Also look for string literals matching /assets/
const assetsInJs = html.match(/\/assets\/[a-zA-Z0-9_\-\.\/]+/g) || [];
assetsInJs.forEach(a => found.add(a.split("?")[0]));

console.log("=== MAINTENANCE ASSET AUDIT ===");
let missingCount = 0;
const results = [];

for (const asset of Array.from(found).sort()) {
  // Ignore page routes like /, /pinned, /request, /upload, /disclaimer
  if (!asset.startsWith("/assets/") && !asset.startsWith("/favicon.ico")) {
    console.log(`[PAGE ROUTE] ${asset}`);
    continue;
  }
  const localPath = path.join("public", asset);
  const exists = fs.existsSync(localPath);
  const size = exists ? fs.statSync(localPath).size : 0;
  console.log(`[${exists ? "EXISTS" : "MISSING"}] ${asset} -> ${localPath} (${size} bytes)`);
  results.push({ asset, localPath, exists, size });
  if (!exists) missingCount++;
}

console.log("\n===============================");
console.log(`TOTAL REFERENCED ASSETS: ${results.length}`);
console.log(`TOTAL MISSING ASSETS: ${missingCount}`);
console.log("===============================");

if (missingCount > 0) {
  process.exit(1);
}
