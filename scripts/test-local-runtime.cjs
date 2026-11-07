// @ts-nocheck
const http = require("http");

function fetchUrl(path) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:8787${path}`, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on("error", reject);
  });
}

async function run() {
  console.log("=== LOCAL PRODUCTION-RUNTIME TEST (http://localhost:8787) ===");
  const root = await fetchUrl("/");
  console.log(`GET / -> HTTP ${root.status}`);
  console.log(`Content-Type: ${root.headers["content-type"]}`);
  console.log(`Cache-Control: ${root.headers["cache-control"]}`);

  const requiredStrings = [
    { name: "navbar present", check: root.body.includes('class="navbar"') },
    { name: "announcement present", check: root.body.includes('class="announcement-bar"') && root.body.includes("PyqVitAp is currently under maintenance") },
    { name: '"Under Maintenance" heading present', check: root.body.includes("Under Maintenance") },
    { name: "expected return card present", check: root.body.includes("Expected Return") && root.body.includes("Before 9 October 2026") },
    { name: "footer present", check: root.body.includes('class="footer"') && root.body.includes("FFCS Mate") && root.body.includes("pyqvitap@gmail.com") },
    { name: "poster reference present", check: root.body.includes("/assets/maintenance/poster.webp") },
    { name: "animation references present", check: root.body.includes("/assets/maintenance/iGV0il5M4W.lottie") && root.body.includes("/assets/maintenance/player.js") },
    { name: "theme switch present", check: root.body.includes("theme-toggle") }
  ];

  let allPassed = true;
  for (const item of requiredStrings) {
    console.log(` - ${item.name}: ${item.check ? "PASS" : "FAIL"}`);
    if (!item.check) allPassed = false;
  }

  // Check /disclaimer
  console.log("\nTesting /disclaimer bypass:");
  const disclaimer = await fetchUrl("/disclaimer");
  console.log(`GET /disclaimer -> HTTP ${disclaimer.status}`);
  console.log(`Content-Type: ${disclaimer.headers["content-type"]}`);
  const disclaimerPass = disclaimer.status === 200 && disclaimer.body.includes("Disclaimer");
  console.log(` - Disclaimer bypass: ${disclaimerPass ? "PASS" : "FAIL"}`);

  if (!allPassed || !disclaimerPass) {
    process.exit(1);
  }
  console.log("\nLOCAL PRODUCTION-RUNTIME TEST: ALL PASS");
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
