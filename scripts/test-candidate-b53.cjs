// @ts-nocheck
const https = require('https');

const CANDIDATE_BASE = 'https://dff3ea9b-pyqvitap-migration-test.pyqvitap.workers.dev';

function requestCandidate(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, CANDIDATE_BASE);
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
  console.log('PHASE 6C-B.5.3: CANDIDATE COMPREHENSIVE VALIDATION');
  console.log('Target:', CANDIDATE_BASE);
  console.log('============================================================\n');

  const results = {
    cold: [],
    warmRounds: [],
    sequential: [],
    parallel5: [],
    parallel10: [],
    smoke: [],
    errors: { '1101': 0, '1102': 0, '1027': 0, '5xx': 0 },
  };

  function checkErrors(res) {
    if (res.status >= 500) results.errors['5xx']++;
    if (res.body.includes('Error 1101') || (res.headers['cf-error-code'] === '1101')) results.errors['1101']++;
    if (res.body.includes('Error 1102') || (res.headers['cf-error-code'] === '1102')) results.errors['1102']++;
    if (res.body.includes('Error 1027') || (res.headers['cf-error-code'] === '1027')) results.errors['1027']++;
  }

  const primaryEndpoints = [
    '/api/course-list',
    '/api/papers/count',
    '/api/papers?subject=Calculus',
    '/api/papers?subject=CHEMISTRY%20AND%20ENVIRONMENTAL%20STUDIES%20%5BCHY1009%5D',
    '/api/paper-by-id/6aa2e4bcb94edf2397e2376c',
    '/paper/6aa2e4bcb94edf2397e2376c',
  ];

  // 1. COLD REQUESTS
  console.log('--- 1. Testing Cold Requests on Candidate ---');
  for (const ep of primaryEndpoints) {
    const res = await requestCandidate(ep);
    checkErrors(res);
    results.cold.push(res);
    console.log(`  [Cold] ${res.status} | ${res.duration.toString().padStart(5)}ms | ${res.size.toString().padStart(6)}B | Ray: ${res.rayId} | ${ep}`);
  }

  // 2. WARM ROUNDS (3 rounds of all primary endpoints)
  console.log('\n--- 2. Testing 3 Warm Rounds of All Primary Endpoints ---');
  for (let round = 1; round <= 3; round++) {
    console.log(`\n  >> Warm Round ${round}:`);
    for (const ep of primaryEndpoints) {
      // short 100ms pause to ensure execution on warm isolate
      await new Promise((r) => setTimeout(r, 100));
      const res = await requestCandidate(ep);
      checkErrors(res);
      results.warmRounds.push({ round, ...res });
      console.log(`    [Round ${round}] ${res.status} | ${res.duration.toString().padStart(5)}ms | ${res.size.toString().padStart(6)}B | Ray: ${res.rayId} | ${ep}`);
    }
  }

  // 3. SEQUENTIAL REQUESTS (10 sequential database requests)
  console.log('\n--- 3. Testing 10 Sequential Database Requests ---');
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
    const res = await requestCandidate(ep);
    checkErrors(res);
    results.sequential.push(res);
    console.log(`  [Seq #${(i + 1).toString().padStart(2)}] ${res.status} | ${res.duration.toString().padStart(5)}ms | ${res.size.toString().padStart(6)}B | Ray: ${res.rayId} | ${ep}`);
  }

  // 4. PARALLEL CONCURRENCY (5 parallel requests)
  console.log('\n--- 4. Testing 5 Parallel Database Requests ---');
  const p5Endpoints = [
    '/api/course-list',
    '/api/papers/count',
    '/api/papers?subject=Calculus',
    '/api/paper-by-id/6aa2e4bcb94edf2397e2376c',
    '/api/related-subject?subject=Calculus',
  ];
  const p5Start = Date.now();
  const p5Res = await Promise.all(p5Endpoints.map((ep) => requestCandidate(ep)));
  const p5Total = Date.now() - p5Start;
  p5Res.forEach((r) => {
    checkErrors(r);
    results.parallel5.push(r);
    console.log(`  [P5] ${r.status} | ${r.duration.toString().padStart(5)}ms | ${r.size.toString().padStart(6)}B | Ray: ${r.rayId} | ${r.path}`);
  });
  console.log(`  >> 5-Parallel Total Time: ${p5Total}ms`);

  // 5. PARALLEL CONCURRENCY (10 parallel requests)
  console.log('\n--- 5. Testing 10 Parallel Database Requests ---');
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
  const p10Res = await Promise.all(p10Endpoints.map((ep) => requestCandidate(ep)));
  const p10Total = Date.now() - p10Start;
  p10Res.forEach((r) => {
    checkErrors(r);
    results.parallel10.push(r);
    console.log(`  [P10] ${r.status} | ${r.duration.toString().padStart(5)}ms | ${r.size.toString().padStart(6)}B | Ray: ${r.rayId} | ${r.path}`);
  });
  console.log(`  >> 10-Parallel Total Time: ${p10Total}ms`);

  // 6. APPLICATION SMOKE TEST
  console.log('\n--- 6. Candidate Application Smoke Test ---');
  const smokeTargets = [
    { name: 'Homepage (/)', path: '/' },
    { name: 'Catalogue (/catalogue)', path: '/catalogue' },
    { name: 'Disclaimer (/disclaimer)', path: '/disclaimer' },
    { name: 'Health Check (/api/health)', path: '/api/health' },
    { name: 'Related Papers API', path: '/api/related-subject?subject=Calculus' },
    { name: 'Slot Contribution API', path: '/api/slot-contribution?paperId=6aa2e4bcb94edf2397e2376c' },
    { name: 'R2 Thumbnail Stream', path: '/api/media/papers/thumbnails/CHY1009_2025_FAT_A1_Set_6_6bcdda1f_thumb.webp' },
    { name: 'R2 PDF Stream', path: '/api/media/papers/pdfs/CHY1009_2025_FAT_A1_Set_6_6bcdda1f.pdf' },
  ];

  for (const st of smokeTargets) {
    const res = await requestCandidate(st.path);
    checkErrors(res);
    results.smoke.push({ ...st, ...res });
    let extra = '';
    if (st.name.includes('PDF')) {
      const isPdf = res.rawBuffer.slice(0, 5).toString('utf8').startsWith('%PDF');
      const cc = res.headers['cache-control'] || '';
      extra = `(isPdf: ${isPdf}, cache-control: "${cc}")`;
    } else if (st.name.includes('Thumbnail')) {
      const isWebp = res.rawBuffer.slice(0, 4).toString('utf8') === 'RIFF' && res.rawBuffer.slice(8, 12).toString('utf8') === 'WEBP';
      extra = `(isWebp: ${isWebp})`;
    }
    console.log(`  [Smoke: ${st.name}] ${res.status} | ${res.duration.toString().padStart(5)}ms | ${res.size.toString().padStart(6)}B | Ray: ${res.rayId} ${extra}`);
  }

  // 7. SUMMARY & VERDICT
  console.log('\n============================================================');
  console.log('CANDIDATE VALIDATION SUMMARY');
  console.log('============================================================');
  console.log(`Total Requests Sent: ${results.cold.length + results.warmRounds.length + results.sequential.length + results.parallel5.length + results.parallel10.length + results.smoke.length}`);
  console.log(`Error 1101 (Worker Exception):      ${results.errors['1101']}`);
  console.log(`Error 1102 (Resource Limit Exceeded): ${results.errors['1102']}`);
  console.log(`Error 1027 (Rate/Worker Limit):       ${results.errors['1027']}`);
  console.log(`HTTP 5xx Server Errors:              ${results.errors['5xx']}`);

  const allRequests = [
    ...results.cold,
    ...results.warmRounds,
    ...results.sequential,
    ...results.parallel5,
    ...results.parallel10,
    ...results.smoke,
  ];

  const allPassed = allRequests.every((r) => r.status === 200);
  console.log(`All Requests HTTP 200: ${allPassed ? 'YES (100% SUCCESS)' : 'NO'}`);
  console.log('============================================================\n');

  if (!allPassed || results.errors['1101'] > 0 || results.errors['1102'] > 0 || results.errors['5xx'] > 0) {
    console.error('VERDICT: FAIL - Candidate has errors or unexpected status codes');
    process.exit(1);
  } else {
    console.log('VERDICT: PASS - Candidate verified completely healthy across cold, warm, sequential, and parallel runs.');
  }
}

run().catch((e) => {
  console.error('Fatal execution error:', e);
  process.exit(1);
});
