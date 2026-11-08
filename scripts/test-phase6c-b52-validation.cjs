// @ts-nocheck
const http = require('http');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const rawLine of content.split('\n')) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        const idx = line.indexOf('=');
        if (idx === -1) continue;
        const key = line.slice(0, idx).trim();
        let val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}
loadEnv();

const BASE_URL = 'http://localhost:3000';

function fetchUrl(pathStr, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathStr, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: options.timeout || 15000,
    };

    const req = http.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy(new Error(`Request to ${pathStr} timed out`));
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function run() {
  console.log('============================================================');
  console.log('PHASE 6C-B.5.2 AUTOMATED RUNTIME VALIDATION (ZERO-RESIDUE)');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(name, condition, details = '') {
    if (condition) {
      console.log(`  ✓ ${name}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${name} ${details}`);
      failed++;
    }
  }

  const createdRequestIds = [];
  const createdReportIds = [];
  const createdEmails = [];

  // 1. Representative Endpoints for every converted model
  console.log('--- 1. Testing Converted Model Representative Endpoints ---');

  // Model: Course -> GET /api/course-list
  try {
    const res = await fetchUrl('/api/course-list');
    const json = JSON.parse(res.body);
    const courses = json.data || json;
    assert('Course model: GET /api/course-list returns 200 array', res.status === 200 && Array.isArray(courses) && courses.length > 200, `Got ${res.status}, length: ${courses?.length}`);
  } catch (e) {
    assert('Course model: GET /api/course-list', false, e.message);
  }

  // Model: CourseCount -> GET /api/papers/count
  try {
    const res = await fetchUrl('/api/papers/count');
    const json = JSON.parse(res.body);
    const counts = json.data || json;
    assert('CourseCount model: GET /api/papers/count returns 200 object', res.status === 200 && typeof counts === 'object' && Object.keys(counts).length > 200);
  } catch (e) {
    assert('CourseCount model: GET /api/papers/count', false, e.message);
  }

  // Model: Paper -> GET /api/papers?subject=Calculus
  try {
    const res = await fetchUrl('/api/papers?subject=Calculus');
    const json = JSON.parse(res.body);
    const papers = json.data?.papers || json.data || json;
    assert('Paper model: GET /api/papers?subject=Calculus returns 200 list', res.status === 200 && Array.isArray(papers) && papers.length > 0, `Got ${res.status}, count: ${papers?.length}`);
  } catch (e) {
    assert('Paper model: GET /api/papers?subject=Calculus', false, e.message);
  }

  // Model: Paper -> GET /api/paper-by-id/6aa2e4bcb94edf2397e2376c
  try {
    const res = await fetchUrl('/api/paper-by-id/6aa2e4bcb94edf2397e2376c');
    const json = JSON.parse(res.body);
    const paper = json.data || json;
    assert('Paper model: GET /api/paper-by-id/[id] returns 200 document', res.status === 200 && paper._id === '6aa2e4bcb94edf2397e2376c');
  } catch (e) {
    assert('Paper model: GET /api/paper-by-id/[id]', false, e.message);
  }

  // Model: Paper -> GET /paper/6aa2e4bcb94edf2397e2376c (SSR HTML)
  try {
    const res = await fetchUrl('/paper/6aa2e4bcb94edf2397e2376c');
    assert('Paper model SSR: GET /paper/[id] returns 200 HTML', res.status === 200 && res.body.includes('<!DOCTYPE html>') && res.body.includes('6aa2e4bcb94edf2397e2376c'));
  } catch (e) {
    assert('Paper model SSR: GET /paper/[id]', false, e.message);
  }

  // Model: RelatedSubject -> GET /api/related-subject?subject=Calculus
  try {
    const res = await fetchUrl('/api/related-subject?subject=Calculus');
    const json = JSON.parse(res.body);
    assert('RelatedSubject model: GET /api/related-subject returns 200', res.status === 200 && json.status === 'success');
  } catch (e) {
    assert('RelatedSubject model: GET /api/related-subject', false, e.message);
  }

  // Models: UpcomingSubject, UpcomingSchedule, UpcomingSlot -> GET /api/upcoming-papers
  try {
    const res = await fetchUrl('/api/upcoming-papers');
    const json = JSON.parse(res.body);
    const valid = res.status === 200 || (res.status === 404 && json.message === 'No selected papers found.');
    assert('UpcomingSubject / Schedule / Slot models: GET /api/upcoming-papers executed DB query without 500', valid, `Got status ${res.status}`);
  } catch (e) {
    assert('Upcoming models: GET /api/upcoming-papers', false, e.message);
  }

  // Model: SlotContribution -> GET /api/slot-contribution?paperId=6aa2e4bcb94edf2397e2376c
  try {
    const res = await fetchUrl('/api/slot-contribution?paperId=6aa2e4bcb94edf2397e2376c');
    const json = JSON.parse(res.body);
    assert('SlotContribution model: GET /api/slot-contribution returns 200', res.status === 200 && json.status === 'success');
  } catch (e) {
    assert('SlotContribution model: GET /api/slot-contribution', false, e.message);
  }

  // Model: PaperRequest -> POST /api/request (Self-cleaning)
  try {
    const res = await fetchUrl('/api/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: 'Validation Ephemeral Course Testing',
        exam: 'CAT-1',
        slot: 'A1',
        year: '2026',
      }),
    });
    const json = JSON.parse(res.body);
    const createdId = json.data?.request?._id;
    if (createdId) createdRequestIds.push(createdId);
    assert('PaperRequest model: POST /api/request returns 201 Created', res.status === 201 && json.status === 'success' && !!createdId);
  } catch (e) {
    assert('PaperRequest model: POST /api/request', false, e.message);
  }

  // Model: TagReport -> POST /api/report-tag (Self-cleaning)
  try {
    const res = await fetchUrl('/api/report-tag', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': `172.16.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`,
      },
      body: JSON.stringify({
        paperId: '6aa2e4bcb94edf2397e2376c',
        comment: 'Automated test ephemeral validation comment',
        reportedFields: [{ field: 'slot', value: 'A1' }],
      }),
    });
    const json = JSON.parse(res.body);
    const createdId = json.data?.report?._id;
    if (createdId) createdReportIds.push(createdId);
    assert('TagReport model: POST /api/report-tag returns 201 Created', res.status === 201 && json.status === 'success' && !!createdId);
  } catch (e) {
    assert('TagReport model: POST /api/report-tag', false, e.message);
  }

  // Model: EmailSub -> POST /api/subscribe (Self-cleaning)
  const ephemeralEmail = `ephemeral-test-${Date.now()}-${Math.floor(Math.random() * 10000)}@vitapstudent.ac.in`;
  try {
    const res = await fetchUrl('/api/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': `10.200.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`,
      },
      body: JSON.stringify({ email: ephemeralEmail }),
    });
    const json = JSON.parse(res.body);
    if (res.status === 200) createdEmails.push(ephemeralEmail);
    assert('EmailSub model: POST /api/subscribe returns 200 OK', res.status === 200 && json.status === 'success');
  } catch (e) {
    assert('EmailSub model: POST /api/subscribe', false, e.message);
  }

  // 2. Sequential Requests
  console.log('\n--- 2. Testing Sequential Mongo Requests (5 iterations) ---');
  let seqSuccess = true;
  const seqLatencies = [];
  for (let i = 1; i <= 5; i++) {
    const start = Date.now();
    const res = await fetchUrl('/api/course-list');
    const elapsed = Date.now() - start;
    seqLatencies.push(elapsed);
    if (res.status !== 200) seqSuccess = false;
  }
  const avgSeq = (seqLatencies.reduce((a, b) => a + b, 0) / seqLatencies.length).toFixed(1);
  assert(`Sequential 5/5 requests succeeded (Avg latency: ${avgSeq}ms, range: ${Math.min(...seqLatencies)}-${Math.max(...seqLatencies)}ms)`, seqSuccess);

  // 3. Parallel Concurrency: 2-parallel
  console.log('\n--- 3. Testing 2-Parallel Requests ---');
  const t2Start = Date.now();
  const res2 = await Promise.all([
    fetchUrl('/api/course-list'),
    fetchUrl('/api/papers/count'),
  ]);
  const t2Elapsed = Date.now() - t2Start;
  const p2Ok = res2.every((r) => r.status === 200);
  assert(`2-Parallel requests: 2/2 returned 200 OK in ${t2Elapsed}ms`, p2Ok);

  // 4. Parallel Concurrency: 5-parallel
  console.log('\n--- 4. Testing 5-Parallel Requests ---');
  const t5Start = Date.now();
  const res5 = await Promise.all([
    fetchUrl('/api/course-list'),
    fetchUrl('/api/papers/count'),
    fetchUrl('/api/papers?subject=Calculus'),
    fetchUrl('/api/related-subject?subject=Calculus'),
    fetchUrl('/api/slot-contribution?paperId=6aa2e4bcb94edf2397e2376c'),
  ]);
  const t5Elapsed = Date.now() - t5Start;
  const p5Ok = res5.every((r) => r.status === 200);
  assert(`5-Parallel requests: 5/5 returned 200 OK in ${t5Elapsed}ms`, p5Ok);

  // 5. Parallel Concurrency: 10-parallel
  console.log('\n--- 5. Testing 10-Parallel Requests ---');
  const t10Start = Date.now();
  const urls10 = [
    '/api/course-list',
    '/api/papers/count',
    '/api/papers?subject=Calculus',
    '/api/related-subject?subject=Calculus',
    '/api/slot-contribution?paperId=6aa2e4bcb94edf2397e2376c',
    '/api/course-list',
    '/api/papers/count',
    '/api/papers?subject=Calculus',
    '/api/paper-by-id/6aa2e4bcb94edf2397e2376c',
    '/api/slot-contribution?paperId=6aa2e4bcb94edf2397e2376c',
  ];
  const res10 = await Promise.all(urls10.map((u) => fetchUrl(u)));
  const t10Elapsed = Date.now() - t10Start;
  const p10Ok = res10.every((r) => r.status === 200);
  assert(`10-Parallel requests: 10/10 returned 200 OK in ${t10Elapsed}ms`, p10Ok);

  // 6. Warm-Isolate Simulation
  console.log('\n--- 6. Testing Warm-Isolate Repeated Execution ---');
  let warmSuccess = true;
  const warmLatencies = [];
  for (let i = 1; i <= 3; i++) {
    // wait 300ms between requests on same warm process
    await new Promise((r) => setTimeout(r, 300));
    const start = Date.now();
    const res = await fetchUrl('/api/papers?subject=Calculus');
    const elapsed = Date.now() - start;
    warmLatencies.push(elapsed);
    if (res.status !== 200) warmSuccess = false;
  }
  const avgWarm = (warmLatencies.reduce((a, b) => a + b, 0) / warmLatencies.length).toFixed(1);
  assert(`Warm-isolate simulation: 3/3 succeeded (Avg latency: ${avgWarm}ms, no stale-socket 500s)`, warmSuccess);

  // 7. Immediate Zero-Residue Cleanup
  console.log('\n--- 7. Zero-Residue Immediate Cleanup ---');
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    if (createdRequestIds.length > 0) {
      const objIds = createdRequestIds.map((id) => new mongoose.Types.ObjectId(id));
      const delReq = await db.collection('paperrequests').deleteMany({ _id: { $in: objIds } });
      console.log(`  ✓ Immediately cleaned up ${delReq.deletedCount} ephemeral paperrequest test record(s).`);
    }

    if (createdReportIds.length > 0) {
      const objIds = createdReportIds.map((id) => new mongoose.Types.ObjectId(id));
      const delRep = await db.collection('tagreports').deleteMany({ _id: { $in: objIds } });
      console.log(`  ✓ Immediately cleaned up ${delRep.deletedCount} ephemeral tagreport test record(s).`);
    }

    if (createdEmails.length > 0) {
      const collections = await db.listCollections().toArray();
      const emailCollName = collections.find((c) => c.name.toLowerCase().includes('email'))?.name || 'emailsubs';
      const delEmail = await db.collection(emailCollName).deleteMany({ email: { $in: createdEmails } });
      console.log(`  ✓ Immediately cleaned up ${delEmail.deletedCount} ephemeral email test record(s).`);
    }

    await mongoose.disconnect();
    assert('Zero-residue test data cleanup succeeded immediately', true);
  } catch (cleanErr) {
    assert('Zero-residue cleanup error', false, cleanErr.message);
  }

  console.log('\n============================================================');
  console.log(`TOTAL PASSED: ${passed}/${passed + failed}`);
  console.log('============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
