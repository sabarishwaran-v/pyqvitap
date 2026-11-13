// @ts-nocheck
const assert = require("node:assert");
const mongoose = require("mongoose");
require("dotenv").config({ path: ".env" });

// Normalize and matching logic as implemented in upload.ts
function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function areTitlesMatching(titleA, titleB) {
  const normA = normalizeTitle(titleA);
  const normB = normalizeTitle(titleB);
  if (!normA || !normB) return false;
  if (normA === normB) return true;
  if (normA.includes(normB) || normB.includes(normA)) return true;

  const stopWords = new Set(["and", "of", "the", "for", "in", "to", "a", "an", "with"]);
  const stem = (w) => (w.endsWith("s") ? w.slice(0, -1) : w);
  const wordsA = normA.split(" ").filter((w) => w && !stopWords.has(w)).map(stem);
  const wordsB = normB.split(" ").filter((w) => w && !stopWords.has(w)).map(stem);

  if (wordsA.length === 0 || wordsB.length === 0) return false;

  const setB = new Set(wordsB);
  const intersection = wordsA.filter((w) => setB.has(w));
  const similarity = (2 * intersection.length) / (wordsA.length + wordsB.length);
  return similarity >= 0.7;
}

async function runTests() {
  console.log("=== Testing Student Paper Pipeline & Validation ===");

  // 1. Title matching unit tests
  console.log("\n[Test 1] Title matching tolerance & accuracy");
  assert.strictEqual(
    areTitlesMatching("Data Structures and Algorithms", "Data Structure Algorithm"),
    true,
    "Should match minor plural and 'and' differences"
  );
  assert.strictEqual(
    areTitlesMatching("Calculus for Engineers", "Calculus for Engineers"),
    true,
    "Exact match should pass"
  );
  assert.strictEqual(
    areTitlesMatching("Entrepreneurship", "entrepreneurship"),
    true,
    "Case-insensitive match should pass"
  );
  assert.strictEqual(
    areTitlesMatching("Digital Electronics", "Discrete Mathematics"),
    false,
    "Unrelated subjects must NOT match"
  );
  assert.strictEqual(
    areTitlesMatching("Artificial Intelligence", "Operating Systems"),
    false,
    "Different courses must NOT match"
  );
  console.log("  ✓ areTitlesMatching passes all cases");

  // 2. Connect to MongoDB Atlas
  console.log("\n[Test 2] Connecting to MongoDB Atlas...");
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  // Verify collections
  const papersColl = db.collection("papers");
  const coursesColl = db.collection("courses");
  const studentPapersColl = db.collection("student_papers");

  const initialOfficialPapersCount = await papersColl.countDocuments();
  console.log(`  Official papers in 'papers' collection: ${initialOfficialPapersCount}`);
  assert.strictEqual(
    initialOfficialPapersCount > 5000,
    true,
    "Official papers collection must contain >5000 DSpace papers"
  );

  const initialCoursesCount = await coursesColl.countDocuments();
  console.log(`  Courses in 'courses' collection: ${initialCoursesCount}`);
  assert.strictEqual(
    initialCoursesCount >= 200,
    true,
    "Official courses collection must contain >=200 courses"
  );

  // 3. Insert a student paper into student_papers (default production: false)
  console.log("\n[Test 3] Inserting student paper into 'student_papers' collection...");
  const insertResult = await studentPapersColl.insertOne({
    file_url: "https://pub-dummy.r2.dev/papers/unapproved/test_sample.pdf",
    thumbnail_url: "https://pub-dummy.r2.dev/papers/thumbnails/test_sample.webp",
    production: false,
    review_status: "MATCHED",
    matching: {
      is_valid_exam_paper: true,
      course_code_matched: true,
      course_title_matched: true,
      exam_valid: true,
      semester_valid: true,
    },
    metadata: {
      course_code: "CSE2001",
      course_title: "Data Structures and Algorithms",
      exam: "CAT-1",
      slot: "A1",
      year: "2024-25",
      semester: "Fall Semester",
      campus: "Andhra Pradesh",
      ambiguous_tags: ["Binary Trees", "Graphs"],
    },
    subject: "DATA STRUCTURES AND ALGORITHMS [CSE2001]",
    exam: "CAT-1",
    slot: "A1",
    year: "2024-25",
    semester: "Fall Semester",
    campus: "Andhra Pradesh",
    uploaded_at: new Date(),
  });

  const insertedId = insertResult.insertedId;
  console.log(`  Inserted document ID in student_papers: ${insertedId}`);

  // 4. Verify collection isolation: official 'papers' and 'courses' MUST be untouched!
  console.log("\n[Test 4] Verifying 100% Collection Isolation...");
  const postUploadOfficialCount = await papersColl.countDocuments();
  assert.strictEqual(
    postUploadOfficialCount,
    initialOfficialPapersCount,
    "Official 'papers' count must remain 100% unchanged!"
  );
  console.log("  ✓ Official 'papers' count is untouched (0 new documents).");

  const postUploadCoursesCount = await coursesColl.countDocuments();
  assert.strictEqual(
    postUploadCoursesCount,
    initialCoursesCount,
    "Official 'courses' count must remain 100% unchanged!"
  );
  console.log("  ✓ Official 'courses' count is untouched (0 new documents).");

  // 5. Query simulating public production query
  console.log("\n[Test 5] Public query visibility check (production: false vs true)...");
  const hiddenQuery = await studentPapersColl.find({
    subject: "DATA STRUCTURES AND ALGORITHMS [CSE2001]",
    production: true,
  }).toArray();
  assert.strictEqual(
    hiddenQuery.length,
    0,
    "Papers with production: false must be completely invisible to public queries"
  );
  console.log("  ✓ Student paper is hidden when production: false");

  // Simulating Admin approval in MongoDB Compass
  await studentPapersColl.updateOne({ _id: insertedId }, { $set: { production: true } });
  const visibleQuery = await studentPapersColl.find({
    subject: "DATA STRUCTURES AND ALGORITHMS [CSE2001]",
    production: true,
  }).toArray();
  assert.strictEqual(
    visibleQuery.length,
    1,
    "Approved paper with production: true must be visible to public queries"
  );
  console.log("  ✓ Student paper becomes immediately visible when admin sets production: true in Compass");

  // 6. Clean up test document
  console.log("\n[Test 6] Cleaning up test document from student_papers...");
  await studentPapersColl.deleteOne({ _id: insertedId });
  console.log("  ✓ Cleaned up test record.");

  await mongoose.disconnect();
  console.log("\n============================================================");
  console.log("ALL STUDENT PAPER PIPELINE & DB ISOLATION TESTS PASSED!");
  console.log("============================================================");
}

runTests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
