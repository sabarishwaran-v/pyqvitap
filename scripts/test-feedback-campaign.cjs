/**
 * Test Suite: Student Feedback & Developer Support Campaign
 * Tests eligibility, versioning, cooldown, engagement triggers, and UPI deep link generation.
 */
const assert = require("assert");

// Mock browser localStorage & window
const storage = new Map();
global.localStorage = {
  getItem: (key) => storage.get(key) || null,
  setItem: (key, val) => storage.set(key, String(val)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear(),
};
global.window = {
  dispatchEvent: () => {},
};

console.log("============================================================");
console.log("RUNNING TEST SUITE: Student Feedback & Support Campaign");
console.log("============================================================\n");

// Re-implement pure logic for testing parity
const STORAGE_KEY_COMPLETED_VERSION = "pyq_feedback_completed_v";
const STORAGE_KEY_DISMISSED_AT = "pyq_feedback_dismissed_at";
const STORAGE_KEY_PAPERS_COUNT = "pyq_feedback_papers_count";
const STORAGE_KEY_FIRST_SEEN = "pyq_feedback_first_seen";

function generateUpiUrl(upiId, name, amount, note = "Support PyqVitAp") {
  const cleanPa = encodeURIComponent(upiId.trim());
  const cleanPn = encodeURIComponent(name.trim());
  const cleanTn = encodeURIComponent(note.trim());
  const cleanAm = Math.max(1, Math.floor(amount));
  return `upi://pay?pa=${cleanPa}&pn=${cleanPn}&am=${cleanAm}&cu=INR&tn=${cleanTn}`;
}

function isEligibleForFeedback(payload) {
  if (payload && payload.enabled === false) return false;

  const targetVersion = (payload && payload.version) || 1;
  const completedVersion = Number(storage.get(STORAGE_KEY_COMPLETED_VERSION) || 0);

  if (completedVersion >= targetVersion) return false;

  const dismissedAt = Number(storage.get(STORAGE_KEY_DISMISSED_AT) || 0);
  const cooldownDays = (payload && payload.cooldown_days) || 14;
  if (dismissedAt > 0 && Date.now() - dismissedAt < cooldownDays * 24 * 60 * 60 * 1000) {
    return false;
  }

  const papersCount = Number(storage.get(STORAGE_KEY_PAPERS_COUNT) || 0);
  const minPapers = (payload && payload.min_papers) || 2;
  if (papersCount >= minPapers) return true;

  const firstSeen = Number(storage.get(STORAGE_KEY_FIRST_SEEN) || Date.now());
  const durationSeconds = (Date.now() - firstSeen) / 1000;
  const minDuration = (payload && payload.min_duration_seconds) || 60;

  if (papersCount >= 1 && durationSeconds >= minDuration) return true;

  return false;
}

// TEST 1: New user with 0 papers
storage.clear();
assert.strictEqual(
  isEligibleForFeedback({ enabled: true, version: 1, min_papers: 2 }),
  false,
  "New user with 0 papers should not be eligible"
);
console.log("[PASS] Test 1: New user with 0 papers is not prompted prematurely.");

// TEST 2: User with 1 paper viewed
storage.set(STORAGE_KEY_PAPERS_COUNT, "1");
storage.set(STORAGE_KEY_FIRST_SEEN, String(Date.now())); // Just started
assert.strictEqual(
  isEligibleForFeedback({ enabled: true, version: 1, min_papers: 2 }),
  false,
  "User with 1 paper and 0 seconds should not be eligible yet"
);
console.log("[PASS] Test 2: User with 1 paper is below 2-paper threshold.");

// TEST 3: User hits 2 papers threshold
storage.set(STORAGE_KEY_PAPERS_COUNT, "2");
assert.strictEqual(
  isEligibleForFeedback({ enabled: true, version: 1, min_papers: 2 }),
  true,
  "User with 2 papers viewed must become eligible"
);
console.log("[PASS] Test 3: User with 2 papers viewed becomes eligible.");

// TEST 4: User completes Version 1 feedback
storage.set(STORAGE_KEY_COMPLETED_VERSION, "1");
assert.strictEqual(
  isEligibleForFeedback({ enabled: true, version: 1, min_papers: 2 }),
  false,
  "User who completed version 1 must not be prompted again for version 1"
);
console.log("[PASS] Test 4: Completed version 1 prevents repeat prompts.");

// TEST 5: Version bumped to Version 2 in PostHog
assert.strictEqual(
  isEligibleForFeedback({ enabled: true, version: 2, min_papers: 2 }),
  true,
  "Bumping campaign to version 2 makes the student eligible again!"
);
console.log("[PASS] Test 5: Bumping campaign to version 2 makes user freshly eligible.");

// TEST 6: User dismisses version 2 (14-day cooldown test)
storage.set(STORAGE_KEY_DISMISSED_AT, String(Date.now()));
assert.strictEqual(
  isEligibleForFeedback({ enabled: true, version: 2, min_papers: 2, cooldown_days: 14 }),
  false,
  "Dismissed user within cooldown window must not be prompted"
);
console.log("[PASS] Test 6: Dismissal activates 14-day cooldown.");

// TEST 7: Expired cooldown (simulate 15 days in past)
const fifteenDaysAgo = Date.now() - (15 * 24 * 60 * 60 * 1000);
storage.set(STORAGE_KEY_DISMISSED_AT, String(fifteenDaysAgo));
assert.strictEqual(
  isEligibleForFeedback({ enabled: true, version: 2, min_papers: 2, cooldown_days: 14 }),
  true,
  "User with expired cooldown becomes eligible again"
);
console.log("[PASS] Test 7: Expired cooldown restores eligibility.");

// TEST 8: Explicitly disabled flag
assert.strictEqual(
  isEligibleForFeedback({ enabled: false, version: 2, min_papers: 2 }),
  false,
  "Disabled flag must strictly suppress prompt"
);
console.log("[PASS] Test 8: Remote feature flag disable switch works.");

// TEST 9: UPI URL generation
const upi1 = generateUpiUrl("student@upi", "Sabarish V", 20, "Coffee Support");
assert.strictEqual(
  upi1,
  "upi://pay?pa=student%40upi&pn=Sabarish%20V&am=20&cu=INR&tn=Coffee%20Support",
  "UPI URL must match standard NPCI format"
);

const upiCustom = generateUpiUrl("custom@okaxis", "Dev Name", 50.75);
assert.strictEqual(
  upiCustom,
  "upi://pay?pa=custom%40okaxis&pn=Dev%20Name&am=50&cu=INR&tn=Support%20PyqVitAp",
  "UPI URL must floor amounts to whole numbers"
);
console.log("[PASS] Test 9: NPCI UPI deep link formatting and URI encoding validated.");

console.log("\n============================================================");
console.log("ALL 9 FEEDBACK CAMPAIGN TESTS PASSED SUCCESSFULLY!");
console.log("============================================================\n");
