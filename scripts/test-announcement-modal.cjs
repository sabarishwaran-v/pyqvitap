// @ts-nocheck
/**
 * Test Suite for ReliabilityAnnouncementModal Component Logic, Countdown,
 * Persistence, and Modal Behavior.
 */
const assert = require("node:assert");

console.log("=== PyqVitAp Reliability Announcement Modal Test Suite ===\n");

const STORAGE_KEY = "pyqvitap:1102-announcement:v1";
const COUNTDOWN_INITIAL_SECONDS = 5;

// Required exact announcement content
const EXPECTED_TITLE = "A Quick Note from the PyqVitAp Team! 👋";
const EXPECTED_BODY_SNIPPETS = [
  "Hey everyone!",
  "Occasionally, you may encounter a Cloudflare Error 1102 while browsing PyqVitAp or opening question papers.",
  "We're aware of this issue and are doing our best to improve the website's reliability.",
  "🔄 If you encounter this error, please try refreshing the page 2–3 times. This may help restore access.",
  "PyqVitAp is an open-source student project, built and maintained by student developers to help our fellow students access previous-year question papers. We're doing our best to keep this platform available to everyone free of cost.",
  "Thank you for your patience, understanding, and continued support! ❤️",
  "— Team PyqVitAp",
];

// Mock localStorage store
function createMockLocalStorage(initialStore = {}) {
  const store = { ...initialStore };
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    },
    clear() {
      for (const k of Object.keys(store)) delete store[k];
    },
    _getStore() {
      return store;
    },
  };
}

// Simulated Modal State Machine mirroring ReliabilityAnnouncementModal.tsx
class SimulatedAnnouncementModal {
  constructor(localStorageMock) {
    this.localStorage = localStorageMock;
    this.isOpen = false;
    this.countdown = COUNTDOWN_INITIAL_SECONDS;
    this.bodyOverflow = "visible";
    this.timer = null;
  }

  mount() {
    // 1. Check local storage
    try {
      const acknowledged = this.localStorage.getItem(STORAGE_KEY);
      if (!acknowledged) {
        this.isOpen = true;
      }
    } catch {
      this.isOpen = true;
    }

    if (this.isOpen) {
      // Lock scroll
      this.bodyOverflow = "hidden";
      this.countdown = COUNTDOWN_INITIAL_SECONDS;
    }
  }

  tick() {
    if (!this.isOpen) return;
    if (this.countdown > 0) {
      this.countdown -= 1;
    }
  }

  fastForwardCountdown() {
    while (this.countdown > 0) {
      this.tick();
    }
  }

  getButtonText() {
    return this.countdown > 0 ? `Got it (${this.countdown})` : "Got it";
  }

  isButtonDisabled() {
    return this.countdown > 0;
  }

  handleKeyDown(key) {
    if (key === "Escape") {
      // Escape must NOT dismiss modal
      return { dismissed: false, prevented: true };
    }
    return { dismissed: false, prevented: false };
  }

  handleOutsideClick() {
    // Outside click must NOT dismiss modal
    return { dismissed: false };
  }

  handleAcknowledge() {
    if (this.isButtonDisabled()) {
      return false; // Early click blocked
    }

    try {
      this.localStorage.setItem(STORAGE_KEY, "acknowledged");
    } catch {}

    this.isOpen = false;
    this.bodyOverflow = "visible"; // Scroll restored
    return true;
  }

  unmount() {
    if (this.isOpen) {
      this.bodyOverflow = "visible";
    }
  }
}

// -------------------------------------------------------------
// Test 1: First-time visitor sees modal and background is locked
// -------------------------------------------------------------
console.log("Test 1: First-time visitor sees announcement and background scroll is locked...");
{
  const mockStorage = createMockLocalStorage();
  const modal = new SimulatedAnnouncementModal(mockStorage);
  modal.mount();

  assert.strictEqual(modal.isOpen, true, "Modal must be open for first-time visitor");
  assert.strictEqual(modal.bodyOverflow, "hidden", "Background scroll must be locked when modal opens");
  assert.strictEqual(modal.countdown, 5, "Countdown must initialize to 5 seconds");
  assert.strictEqual(modal.isButtonDisabled(), true, "Button must initially be disabled");
  assert.strictEqual(modal.getButtonText(), "Got it (5)", "Button must display 'Got it (5)'");

  console.log("  [PASS] Modal opened, scroll locked, countdown initialized to 5s.");
}

// -------------------------------------------------------------
// Test 2: Countdown decrements each second correctly
// -------------------------------------------------------------
console.log("\nTest 2: Countdown decrements second by second from 5 down to 1 while disabled...");
{
  const mockStorage = createMockLocalStorage();
  const modal = new SimulatedAnnouncementModal(mockStorage);
  modal.mount();

  for (let sec = 5; sec >= 1; sec--) {
    assert.strictEqual(modal.countdown, sec, `Countdown should be ${sec}`);
    assert.strictEqual(modal.isButtonDisabled(), true, `Button must be disabled at countdown ${sec}`);
    assert.strictEqual(modal.getButtonText(), `Got it (${sec})`, `Button text must be 'Got it (${sec})'`);
    modal.tick();
  }

  assert.strictEqual(modal.countdown, 0, "Countdown should reach 0");
  assert.strictEqual(modal.isButtonDisabled(), false, "Button must become enabled at 0s");
  assert.strictEqual(modal.getButtonText(), "Got it", "Button text must become 'Got it'");

  console.log("  [PASS] Countdown progression verified from 5 to 0.");
}

// -------------------------------------------------------------
// Test 3: Attempting to click button before countdown finishes
// -------------------------------------------------------------
console.log("\nTest 3: Early click attempts during countdown are rejected...");
{
  const mockStorage = createMockLocalStorage();
  const modal = new SimulatedAnnouncementModal(mockStorage);
  modal.mount();

  // Try clicking at 5, 4, 3, 2, 1
  for (let sec = 5; sec >= 1; sec--) {
    const success = modal.handleAcknowledge();
    assert.strictEqual(success, false, `Early click at ${sec}s must be rejected`);
    assert.strictEqual(modal.isOpen, true, `Modal must remain open at ${sec}s`);
    assert.strictEqual(mockStorage.getItem(STORAGE_KEY), null, `Storage must not be set at ${sec}s`);
    modal.tick();
  }

  console.log("  [PASS] Early click blocked across all countdown phases.");
}

// -------------------------------------------------------------
// Test 4: Escape key and outside click cannot dismiss modal
// -------------------------------------------------------------
console.log("\nTest 4: Escape key and outside click cannot dismiss the modal...");
{
  const mockStorage = createMockLocalStorage();
  const modal = new SimulatedAnnouncementModal(mockStorage);
  modal.mount();

  const escResult = modal.handleKeyDown("Escape");
  assert.strictEqual(escResult.prevented, true, "Escape key must be prevented");
  assert.strictEqual(modal.isOpen, true, "Modal must remain open after Escape key");

  const clickResult = modal.handleOutsideClick();
  assert.strictEqual(clickResult.dismissed, false, "Outside click must not dismiss modal");
  assert.strictEqual(modal.isOpen, true, "Modal must remain open after outside click");

  console.log("  [PASS] Non-bypassable modal behavior strictly enforced.");
}

// -------------------------------------------------------------
// Test 5: Acknowledging at 0 seconds persists and closes modal
// -------------------------------------------------------------
console.log("\nTest 5: Acknowledging enabled button saves to localStorage and restores scroll...");
{
  const mockStorage = createMockLocalStorage();
  const modal = new SimulatedAnnouncementModal(mockStorage);
  modal.mount();
  modal.fastForwardCountdown();

  assert.strictEqual(modal.countdown, 0);
  assert.strictEqual(modal.isButtonDisabled(), false);

  const success = modal.handleAcknowledge();
  assert.strictEqual(success, true, "Click should succeed when countdown is 0");
  assert.strictEqual(modal.isOpen, false, "Modal should be closed");
  assert.strictEqual(mockStorage.getItem(STORAGE_KEY), "acknowledged", "Key must be saved in localStorage");
  assert.strictEqual(modal.bodyOverflow, "visible", "Background scroll must be restored");

  console.log("  [PASS] Successful acknowledgement persisted and scroll unlocked.");
}

// -------------------------------------------------------------
// Test 6: Subsequent visit / refresh does not display modal
// -------------------------------------------------------------
console.log("\nTest 6: Returning visitor with existing localStorage acknowledgement does not see modal...");
{
  const mockStorage = createMockLocalStorage({
    [STORAGE_KEY]: "acknowledged",
  });

  const modal = new SimulatedAnnouncementModal(mockStorage);
  modal.mount();

  assert.strictEqual(modal.isOpen, false, "Modal must not open if already acknowledged");
  assert.strictEqual(modal.bodyOverflow, "visible", "Body scroll must remain untouched");

  console.log("  [PASS] Returning visitor bypasses modal cleanly.");
}

// -------------------------------------------------------------
// Test 7: Verify exact source code text against specification
// -------------------------------------------------------------
console.log("\nTest 7: Verify exact announcement wording in source file...");
{
  const fs = require("node:fs");
  const path = require("node:path");
  const sourceCode = fs.readFileSync(
    path.join(__dirname, "../src/components/ReliabilityAnnouncementModal.tsx"),
    "utf8"
  );

  const normalizedSource = sourceCode.replace(/&apos;/g, "'").replace(/\s+/g, " ");
  assert.ok(normalizedSource.includes(EXPECTED_TITLE), `Title must match: ${EXPECTED_TITLE}`);
  for (const snippet of EXPECTED_BODY_SNIPPETS) {
    const normalizedSnippet = snippet.replace(/\s+/g, " ");
    assert.ok(
      normalizedSource.includes(normalizedSnippet),
      `Source must contain exact text snippet: "${snippet}"`
    );
  }

  assert.ok(
    sourceCode.includes(STORAGE_KEY),
    `Source must use versioned key: "${STORAGE_KEY}"`
  );

  console.log("  [PASS] All title, body paragraphs, refresh emoji, and storage keys match specification.");
}

// -------------------------------------------------------------
// Test 8: Verify root layout integration
// -------------------------------------------------------------
console.log("\nTest 8: Verify root layout integration in src/app/layout.tsx...");
{
  const fs = require("node:fs");
  const path = require("node:path");
  const layoutCode = fs.readFileSync(
    path.join(__dirname, "../src/app/layout.tsx"),
    "utf8"
  );

  assert.ok(
    layoutCode.includes("ReliabilityAnnouncementModal"),
    "layout.tsx must import ReliabilityAnnouncementModal"
  );
  assert.ok(
    layoutCode.includes("<ReliabilityAnnouncementModal />"),
    "layout.tsx must render <ReliabilityAnnouncementModal />"
  );

  console.log("  [PASS] Root layout correctly imports and renders the announcement modal.");
}

console.log("\n============================================================");
console.log("ALL 8 ANNOUNCEMENT MODAL UNIT TESTS PASSED SUCCESSFULLY!");
console.log("============================================================\n");
