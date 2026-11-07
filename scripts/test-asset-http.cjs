// @ts-nocheck
const http = require("http");

const assets = [
  { path: "/assets/maintenance/poster.webp", expectedType: "image/webp" },
  { path: "/assets/maintenance/iGV0il5M4W.lottie", expectedType: "application/octet-stream" }, // or application/zip / wasm
  { path: "/assets/maintenance/dotlottie-player.wasm", expectedType: "application/wasm" },
  { path: "/assets/maintenance/player.js", expectedType: "text/javascript" },
  { path: "/assets/fonts/jostfont.ttf", expectedType: "font/ttf" },
  { path: "/assets/fonts/play.ttf", expectedType: "font/ttf" },
  { path: "/assets/images/navbar_logo.png", expectedType: "image/png" }
];

function fetchAsset(path) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:8787${path}`, (res) => {
      const chunks = [];
      res.on("data", chunk => chunks.push(chunk));
      res.on("end", () => {
        const body = Buffer.concat(chunks);
        resolve({
          status: res.statusCode,
          contentType: res.headers["content-type"],
          contentLength: res.headers["content-length"] || body.length,
          bytes: body.length
        });
      });
    });
    req.on("error", reject);
  });
}

async function run() {
  console.log("=== ASSET HTTP TEST (http://localhost:8787) ===");
  let allPassed = true;

  for (const item of assets) {
    const res = await fetchAsset(item.path);
    const statusPass = res.status === 200;
    const typePass = res.contentType && (res.contentType.includes(item.expectedType) || res.contentType.includes(item.expectedType.split("/")[1]));
    const sizePass = res.bytes > 0;
    const pass = statusPass && sizePass;

    console.log(`Asset: ${item.path}`);
    console.log(` - Status: HTTP ${res.status} (${statusPass ? "PASS" : "FAIL"})`);
    console.log(` - Content-Type: ${res.contentType}`);
    console.log(` - Content-Length: ${res.bytes} bytes`);
    console.log(` - Result: ${pass ? "PASS" : "FAIL"}\n`);

    if (!pass) allPassed = false;
  }

  console.log("ASSET HTTP TEST OVERALL:", allPassed ? "ALL 7/7 ASSETS PASSED" : "FAILED");
  if (!allPassed) process.exit(1);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
