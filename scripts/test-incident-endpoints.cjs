// @ts-nocheck
/**
 * Diagnostic probe for production incident endpoints
 */
const https = require("node:https");

const TARGET_HOST = "pyqvitap.site";

const TEST_PATHS = [
  { name: "Homepage", path: "/" },
  { name: "Catalogue", path: "/catalogue" },
  { name: "Health API", path: "/api/health" },
  { name: "Papers API (all)", path: "/api/papers" },
  { name: "Papers API (Calculus)", path: "/api/papers?subject=Calculus" },
  { name: "Paper by ID API", path: "/api/paper-by-id/6aaf7dc6faf057904421b8fd" },
  { name: "Paper Page SSR", path: "/paper/6aaf7dc6faf057904421b8fd" },
];

function probe(item) {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = https.request(
      {
        hostname: TARGET_HOST,
        port: 443,
        path: item.path,
        method: "GET",
        headers: {
          "User-Agent": "PyqVitAp-Incident-Probe/1.0",
          Accept: "*/*",
        },
        timeout: 20000,
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          const duration = Date.now() - start;
          resolve({
            name: item.name,
            path: item.path,
            status: res.statusCode,
            statusMessage: res.statusMessage,
            durationMs: duration,
            contentLength: body.length,
            cfRay: res.headers["cf-ray"] || null,
            contentType: res.headers["content-type"] || null,
            cfError: res.headers["cf-error-type"] || null,
            sampleBody: body.slice(0, 300),
          });
        });
      }
    );

    req.on("timeout", () => {
      req.destroy();
      const duration = Date.now() - start;
      resolve({
        name: item.name,
        path: item.path,
        status: 408,
        statusMessage: "TIMEOUT",
        durationMs: duration,
        error: "Client socket timeout after 20s",
      });
    });

    req.on("error", (err) => {
      const duration = Date.now() - start;
      resolve({
        name: item.name,
        path: item.path,
        status: 0,
        statusMessage: "ERROR",
        durationMs: duration,
        error: err.message,
      });
    });

    req.end();
  });
}

async function main() {
  console.log("Probing production endpoints sequentially...");
  for (const item of TEST_PATHS) {
    console.log(`\nTesting ${item.name} (${item.path})...`);
    const result = await probe(item);
    console.log(JSON.stringify(result, null, 2));
  }
}

main().catch(console.error);
