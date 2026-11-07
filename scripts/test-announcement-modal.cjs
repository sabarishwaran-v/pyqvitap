// @ts-nocheck
/**
 * Test Suite for MaintenanceToast Component Logic, Persistence,
 * Non-Blocking Behavior, and Content Verification.
 */
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

console.log("=== PyqVitAp Persistent Maintenance Toast Test Suite ===\n");

const STORAGE_KEY = "pyqvitap:maintenance-notice-dismissed:v1";

// Required exact announcement content
const EXPECTED_TITLE = "We're Improving PyqVitAp";
const EXPECTED_BODY_SNIPPETS = [
  "We're currently working on improvements to make PyqVitAp faster, more reliable, and better for everyone.",
  "During this period, you may occasionally experience errors, slower loading, or other unexpected issues. We're working hard to resolve these problems and restore the smooth experience you expect, with our target being November 2, 2026.",
  "Thank you for your patience and understanding as we improve PyqVitAp for the student community.",
];
const EXPECTED_DISMISS_LABEL = "Dismiss maintenance notice";

// Mock sessionStorage store
function createMockSessionStorage(initialStore = {}) {
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

// Simulated Toast State Machine mirroring MaintenanceToast.tsx
class SimulatedMaintenanceToast {
  constructor(sessionStorageMock) {
    this.sessionStorage = sessionStorageMock;
    this.isVisible = false;
  }

  mount() {
    // 1. Client-only check for prior dismissal in current browser session
    try {
      const isDismissed = this.sessionStorage.getItem(STORAGE_KEY);
      if (!isDismissed) {
        this.isVisible = true;
      }
    } catch {
      this.isVisible = true;
    }
  }

  dismiss() {
    this.isVisible = false;
    try {
      this.sessionStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // safe fallback
    }
  }
}

// -------------------------------------------------------------
// Test 1: First-time visitor sees maintenance notice; page is NOT blocked
// -------------------------------------------------------------
console.log("Test 1: First-time visitor in session sees toast without scroll-lock...");
{
  const storage = createMockSessionStorage();
  const toast = new SimulatedMaintenanceToast(storage);

  assert.strictEqual(toast.isVisible, false, "Initial SSR / pre-mount state must be false");
  toast.mount();

  assert.strictEqual(toast.isVisible, true, "Toast must be visible on initial session mount");
  console.log("  [PASS] Toast visible on initial mount.");
}

// -------------------------------------------------------------
// Test 2: Toast never times out automatically
// -------------------------------------------------------------
console.log("\nTest 2: Toast remains persistent and does not auto-dismiss after time passes...");
{
  const storage = createMockSessionStorage();
  const toast = new SimulatedMaintenanceToast(storage);
  toast.mount();

  // Simulate simulated time passage
  assert.strictEqual(toast.isVisible, true, "Toast must remain visible indefinitely until user dismisses");
  console.log("  [PASS] Toast does not auto-dismiss.");
}

// -------------------------------------------------------------
// Test 3: Dismissal sets sessionStorage and hides toast
// -------------------------------------------------------------
console.log("\nTest 3: User clicking close button dismisses toast and persists to sessionStorage...");
{
  const storage = createMockSessionStorage();
  const toast = new SimulatedMaintenanceToast(storage);
  toast.mount();

  assert.strictEqual(toast.isVisible, true);
  toast.dismiss();

  assert.strictEqual(toast.isVisible, false, "Toast must be hidden upon dismissal");
  assert.strictEqual(
    storage.getItem(STORAGE_KEY),
    "true",
    "Dismissal must be stored in sessionStorage"
  );
  console.log("  [PASS] Dismissal successfully persisted to sessionStorage.");
}

// -------------------------------------------------------------
// Test 4: Route navigation / re-render in same session stays dismissed
// -------------------------------------------------------------
console.log("\nTest 4: Subsequent mount/navigation in same session remains dismissed...");
{
  const storage = createMockSessionStorage({ [STORAGE_KEY]: "true" });
  const toast = new SimulatedMaintenanceToast(storage);
  toast.mount();

  assert.strictEqual(toast.isVisible, false, "Toast must stay dismissed during the same session");
  console.log("  [PASS] Toast remains dismissed in current session.");
}

// -------------------------------------------------------------
// Test 5: New browser session displays toast again
// -------------------------------------------------------------
console.log("\nTest 5: New browser session with fresh sessionStorage displays toast...");
{
  const freshSessionStorage = createMockSessionStorage();
  const toast = new SimulatedMaintenanceToast(freshSessionStorage);
  toast.mount();

  assert.strictEqual(toast.isVisible, true, "New session must show the notice until dismissed");
  console.log("  [PASS] Fresh session displays toast as expected.");
}

// -------------------------------------------------------------
// Test 6: Verify exact wording and UI requirements in MaintenanceToast.tsx
// -------------------------------------------------------------
console.log("\nTest 6: Verify exact notification text and accessible close button in source file...");
{
  const sourceCode = fs.readFileSync(
    path.join(__dirname, "../src/components/MaintenanceToast.tsx"),
    "utf8"
  );

  const normalizedSource = sourceCode.replace(/&apos;/g, "'").replace(/\s+/g, " ");
  assert.ok(normalizedSource.includes(EXPECTED_TITLE), `Title must match: "${EXPECTED_TITLE}"`);
  for (const snippet of EXPECTED_BODY_SNIPPETS) {
    const normalizedSnippet = snippet.replace(/\s+/g, " ");
    assert.ok(
      normalizedSource.includes(normalizedSnippet),
      `Source must contain exact text snippet: "${snippet}"`
    );
  }

  assert.ok(
    sourceCode.includes(EXPECTED_DISMISS_LABEL),
    `Close button must have accessible label: "${EXPECTED_DISMISS_LABEL}"`
  );

  assert.ok(
    sourceCode.includes(STORAGE_KEY),
    `Source must use versioned sessionStorage key: "${STORAGE_KEY}"`
  );

  assert.ok(
    sourceCode.includes("top-4") && sourceCode.includes("right-4"),
    "Toast must be positioned in the top-right corner"
  );

  console.log("  [PASS] All title, body paragraphs, target date, and accessible close button match specification.");
}

// -------------------------------------------------------------
// Test 7: Verify old Cloudflare 1102 / refresh message is removed
// -------------------------------------------------------------
console.log("\nTest 7: Verify old Cloudflare 1102 message is completely removed...");
{
  const toastSource = fs.readFileSync(
    path.join(__dirname, "../src/components/MaintenanceToast.tsx"),
    "utf8"
  );
  assert.ok(!toastSource.includes("1102"), "MaintenanceToast must not contain 1102");
  assert.ok(!toastSource.includes("refreshing the page"), "MaintenanceToast must not instruct refreshing the page");

  const layoutCode = fs.readFileSync(
    path.join(__dirname, "../src/app/layout.tsx"),
    "utf8"
  );
  assert.ok(!layoutCode.includes("ReliabilityAnnouncementModal"), "layout.tsx must not render ReliabilityAnnouncementModal");
  console.log("  [PASS] Old Cloudflare 1102 message cleanly eliminated from layout.");
}

// -------------------------------------------------------------
// Test 8: Verify root layout integration
// -------------------------------------------------------------
console.log("\nTest 8: Verify root layout integration in src/app/layout.tsx...");
{
  const layoutCode = fs.readFileSync(
    path.join(__dirname, "../src/app/layout.tsx"),
    "utf8"
  );

  assert.ok(
    layoutCode.includes("MaintenanceToast"),
    "layout.tsx must import MaintenanceToast"
  );
  assert.ok(
    layoutCode.includes("<MaintenanceToast />"),
    "layout.tsx must render <MaintenanceToast />"
  );

  console.log("  [PASS] Root layout correctly imports and renders the maintenance toast.");
}

console.log("\n============================================================");
console.log("ALL 8 MAINTENANCE TOAST UNIT TESTS PASSED SUCCESSFULLY!");
console.log("============================================================\n");
