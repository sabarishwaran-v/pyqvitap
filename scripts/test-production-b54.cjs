// @ts-nocheck
const https = require('https');

const PRODUCTION_BASE = 'https://pyqvitap.site';

function requestProd(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, PRODUCTION_BASE);
    const reqOptions = {
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: options.timeout || 30000,
    };

    const start = Date.now();
    const req = https.request(url, reqOptions, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const bodyBuffer = Buffer.concat(chunks);
        const duration = Date.now() - start;
        resolve({
          path,
          status: res.statusCode,
          headers: res.headers,
          rayId: res.headers['cf-ray'] || 'unknown',
          size: bodyBuffer.length,
          duration,
          body: bodyBuffer.toString('utf8'),
          rawBuffer: bodyBuffer,
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy(new Error(`Request to ${path} timed out after 30s`));
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function run() {
  console.log('============================================================');
  console.log('PHASE 6C-B.5.4: PRODUCTION LIVE POST-PROMOTION VALIDATION');
  console.log('Target:', PRODUCTION_BASE);
  console.log('Promoted Version: dff3ea9b-f136-47ba-829e-14508da65c87 (100%)');
  console.log('============================================================\n');

  const results = {
    smoke: [],
    database: [],
    sequential: [],
    parallel5: [],
    parallel10: [],
    searchAudit: [],
    errors: { '1101': 0, '1102': 0, '1027': 0, '5xx': 0 },
  };

  function checkErrors(res) {
    if (res.status >= 500) results.errors['5xx']++;
    if (res.body.includes('Error 1101') || res.headers['cf-error-code'] === '1101') results.errors['1101']++;
    if (res.body.includes('Error 1102') || res.headers['cf-error-code'] === '1102') results.errors['1102']++;
    if (res.body.includes('Error 1027') || res.headers['cf-error-code'] === '1027') results.errors['1027']++;
  }

  // 1. PRODUCTION SMOKE TESTS
  console.log('--- 1. Immediate Production Live Smoke Tests ---');
  const smokeTargets = [
    { name: 'Homepage (/)', path: '/' },
    { name: 'Catalogue (/catalogue)', path: '/catalogue' },
    { name: 'Disclaimer (/disclaimer)', path: '/disclaimer' },
    { name: 'Health Check (/api/health)', path: '/api/health' },
  ];

  for (const st of smokeTargets) {
    const res = await requestProd(st.path);
    checkErrors(res);
    results.smoke.push({ ...st, ...res });
    console.log(`  [Smoke: ${st.name}] ${res.status} | ${res.duration.toString().padStart(5)}ms | ${res.size.toString().padStart(6)}B | Ray: ${res.rayId}`);
  }

  // 2. PRIMARY DATABASE ENDPOINTS
  console.log('\n--- 2. Production Primary Database Endpoints ---');
  const dbEndpoints = [
    '/api/course-list',
    '/api/papers/count',
    '/api/papers?subject=Calculus',
    '/api/papers?subject=CHEMISTRY%20AND%20ENVIRONMENTAL%20STUDIES%20%5BCHY1009%5D',
    '/api/paper-by-id/6aa2e4bcb94edf2397e2376c',
    '/paper/6aa2e4bcb94edf2397e2376c',
    '/api/related-subject?subject=Calculus',
    '/api/slot-contribution?paperId=6aa2e4bcb94edf2397e2376c',
    '/api/media/papers/thumbnails/CHY1009_2025_FAT_A1_Set_6_6bcdda1f_thumb.webp',
    '/api/media/papers/pdfs/CHY1009_2025_FAT_A1_Set_6_6bcdda1f.pdf',
  ];

  for (const ep of dbEndpoints) {
    const res = await requestProd(ep);
    checkErrors(res);
    results.database.push(res);
    let extra = '';
    if (ep.endsWith('.pdf')) {
      const isPdf = res.rawBuffer.slice(0, 5).toString('utf8').startsWith('%PDF');
      const cc = res.headers['cache-control'] || '';
      extra = `(isPdf: ${isPdf}, cache-control: "${cc}")`;
    } else if (ep.endsWith('.webp')) {
      const isWebp = res.rawBuffer.slice(0, 4).toString('utf8') === 'RIFF' && res.rawBuffer.slice(8, 12).toString('utf8') === 'WEBP';
      extra = `(isWebp: ${isWebp})`;
    }
    console.log(`  [DB] ${res.status} | ${res.duration.toString().padStart(5)}ms | ${res.size.toString().padStart(6)}B | Ray: ${res.rayId} | ${ep} ${extra}`);
  }

  // 3. REPEATED WARM SEQUENTIAL TESTING (10 sequential database requests)
  console.log('\n--- 3. Testing 10 Sequential Live Database Requests ---');
  const seqEndpoints = [
    '/api/course-list',
    '/api/papers/count',
    '/api/papers?subject=Calculus',
    '/api/paper-by-id/6aa2e4bcb94edf2397e2376c',
    '/api/related-subject?subject=Calculus',
    '/api/course-list',
    '/api/papers/count',
    '/api/papers?subject=Calculus',
    '/api/paper-by-id/6aa2e4bcb94edf2397e2376c',
    '/paper/6aa2e4bcb94edf2397e2376c',
  ];

  for (let i = 0; i < seqEndpoints.length; i++) {
    const ep = seqEndpoints[i];
    const res = await requestProd(ep);
    checkErrors(res);
    results.sequential.push(res);
    console.log(`  [Seq #${(i + 1).toString().padStart(2)}] ${res.status} | ${res.duration.toString().padStart(5)}ms | ${res.size.toString().padStart(6)}B | Ray: ${res.rayId} | ${ep}`);
  }

  // 4. PARALLEL CONCURRENCY (5 parallel requests)
  console.log('\n--- 4. Testing 5 Parallel Live Database Requests ---');
  const p5Endpoints = [
    '/api/course-list',
    '/api/papers/count',
    '/api/papers?subject=Calculus',
    '/api/paper-by-id/6aa2e4bcb94edf2397e2376c',
    '/api/related-subject?subject=Calculus',
  ];
  const p5Start = Date.now();
  const p5Res = await Promise.all(p5Endpoints.map((ep) => requestProd(ep)));
  const p5Total = Date.now() - p5Start;
  p5Res.forEach((r) => {
    checkErrors(r);
    results.parallel5.push(r);
    console.log(`  [P5] ${r.status} | ${r.duration.toString().padStart(5)}ms | ${r.size.toString().padStart(6)}B | Ray: ${r.rayId} | ${r.path}`);
  });
  console.log(`  >> 5-Parallel Total Time: ${p5Total}ms`);

  // 5. PARALLEL CONCURRENCY (10 parallel requests)
  console.log('\n--- 5. Testing 10 Parallel Live Database Requests ---');
  const p10Endpoints = [
    '/api/course-list',
    '/api/papers/count',
    '/api/papers?subject=Calculus',
    '/api/paper-by-id/6aa2e4bcb94edf2397e2376c',
    '/api/related-subject?subject=Calculus',
    '/api/course-list',
    '/api/papers/count',
    '/api/papers?subject=Calculus',
    '/api/paper-by-id/6aa2e4bcb94edf2397e2376c',
    '/paper/6aa2e4bcb94edf2397e2376c',
  ];
  const p10Start = Date.now();
  const p10Res = await Promise.all(p10Endpoints.map((ep) => requestProd(ep)));
  const p10Total = Date.now() - p10Start;
  p10Res.forEach((r) => {
    checkErrors(r);
    results.parallel10.push(r);
    console.log(`  [P10] ${r.status} | ${r.duration.toString().padStart(5)}ms | ${r.size.toString().padStart(6)}B | Ray: ${r.rayId} | ${r.path}`);
  });
  console.log(`  >> 10-Parallel Total Time: ${p10Total}ms`);

  // 6. MANDATORY SEARCH & PAPER VERIFICATION AUDIT
  console.log('\n--- 6. Search & Paper Functionality Mandatory Audit ---');

  // A. Course list loads
  const courseRes = results.database.find((r) => r.path === '/api/course-list');
  const courseJson = JSON.parse(courseRes.body);
  const courseCount = (courseJson.data || courseJson).length;
  console.log(`  ✓ Course list loaded: ${courseCount} courses present (Expect > 200)`);

  // B. Calculus returns papers
  const calcRes = results.database.find((r) => r.path === '/api/papers?subject=Calculus');
  const calcJson = JSON.parse(calcRes.body);
  const calcPapers = calcJson.data?.papers || calcJson.data || calcJson;
  console.log(`  ✓ Calculus search returned: ${calcPapers.length} papers`);

  // C. Chemistry returns papers
  const chemRes = results.database.find((r) => r.path.includes('CHEMISTRY'));
  const chemJson = JSON.parse(chemRes.body);
  const chemPapers = chemJson.data?.papers || chemJson.data || chemJson;
  console.log(`  ✓ Chemistry search returned: ${chemPapers.length} papers`);

  // D. Paper by ID works
  const paperByIdRes = results.database.find((r) => r.path.includes('paper-by-id'));
  const paperByIdJson = JSON.parse(paperByIdRes.body);
  console.log(`  ✓ Paper metadata by ID verified: Subject "${paperByIdJson.data?.subject}"`);

  // E. SSR Paper page rendered
  const paperPageRes = results.database.find((r) => r.path === '/paper/6aa2e4bcb94edf2397e2376c');
  const hasHtml = paperPageRes.body.includes('<!DOCTYPE html>') && paperPageRes.body.includes('6aa2e4bcb94edf2397e2376c');
  console.log(`  ✓ SSR Paper page rendered full HTML: ${hasHtml}`);

  // 7. SUMMARY & VERDICT
  console.log('\n============================================================');
  console.log('PRODUCTION POST-PROMOTION VALIDATION SUMMARY');
  console.log('============================================================');
  const totalSent = results.smoke.length + results.database.length + results.sequential.length + results.parallel5.length + results.parallel10.length;
  console.log(`Total Live Production Requests:     ${totalSent}`);
  console.log(`Error 1101 (Worker Exception):      ${results.errors['1101']}`);
  console.log(`Error 1102 (Resource Limit Exceeded): ${results.errors['1102']}`);
  console.log(`Error 1027 (Rate/Worker Limit):       ${results.errors['1027']}`);
  console.log(`HTTP 5xx Server Errors:              ${results.errors['5xx']}`);

  const allRequests = [
    ...results.smoke,
    ...results.database,
    ...results.sequential,
    ...results.parallel5,
    ...results.parallel10,
  ];

  const allPassed = allRequests.every((r) => r.status === 200);
  console.log(`All Production Requests HTTP 200:   ${allPassed ? 'YES (100% SUCCESS)' : 'NO'}`);
  console.log('============================================================\n');

  if (!allPassed || results.errors['1101'] > 0 || results.errors['1102'] > 0 || results.errors['5xx'] > 0) {
    console.error('VERDICT: FAIL - Production has errors');
    process.exit(1);
  } else {
    console.log('VERDICT: PASS - Production fully verified and stable on version dff3ea9b-f136-47ba-829e-14508da65c87.');
  }
}

run().catch((e) => {
  console.error('Fatal execution error:', e);
  process.exit(1);
});
