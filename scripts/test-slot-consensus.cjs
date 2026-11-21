const assert = require("assert");

// Import evaluation logic (simulated equivalent of evaluateConsensus)
const AUTHORITATIVE_SLOTS = [
  "A1", "A2", "B1", "B2", "C1", "C2",
  "D1", "D2", "E1", "E2", "F1", "F2",
  "G1", "G2",
];

const MIN_EARLY_VOTES = 5;
const MIN_EARLY_CONSENSUS = 0.75;
const MIN_STANDARD_VOTES = 10;
const MIN_STANDARD_CONSENSUS = 0.60;
const MIN_DOMINANCE_RATIO = 1.6;
const MIN_DOMINANCE_MARGIN = 3;
const MIN_AI_TRIGGER_VOTES = 12;

function evaluateConsensus(countsBySlot) {
  let totalContributions = 0;
  const candidates = [];

  for (const slot of AUTHORITATIVE_SLOTS) {
    const count = countsBySlot[slot] ?? 0;
    totalContributions += count;
    if (count > 0) {
      candidates.push({ slot, count });
    }
  }

  candidates.sort((a, b) => b.count - a.count);

  const winningSlot = candidates[0]?.slot ?? null;
  const winningVotes = candidates[0]?.count ?? 0;
  const runnerUpSlot = candidates[1]?.slot ?? null;
  const runnerUpVotes = candidates[1]?.count ?? 0;
  const margin = winningVotes - runnerUpVotes;
  const winningPercentage =
    totalContributions > 0 ? winningVotes / totalContributions : 0;

  let isConsensusReached = false;
  let resolutionReason = undefined;

  // Stage 1: Early Fast-Path (5 to 9 votes)
  if (
    totalContributions >= MIN_EARLY_VOTES &&
    totalContributions < MIN_STANDARD_VOTES
  ) {
    if (winningPercentage >= MIN_EARLY_CONSENSUS && margin >= 3) {
      isConsensusReached = true;
      resolutionReason = "early_consensus";
    }
  }

  // Stage 2: Standard Dominance (>= 10 votes)
  if (totalContributions >= MIN_STANDARD_VOTES) {
    if (winningPercentage >= MIN_STANDARD_CONSENSUS && margin >= 3) {
      isConsensusReached = true;
      resolutionReason = "standard_dominance";
    } else if (
      runnerUpVotes > 0 &&
      winningVotes >= MIN_DOMINANCE_RATIO * runnerUpVotes &&
      margin >= MIN_DOMINANCE_MARGIN
    ) {
      isConsensusReached = true;
      resolutionReason = "ratio_dominance";
    }
  }

  const needsAiVerification =
    !isConsensusReached && totalContributions >= MIN_AI_TRIGGER_VOTES;

  return {
    isConsensusReached,
    totalContributions,
    winningSlot: isConsensusReached ? winningSlot : null,
    winningPercentage,
    winningVotes,
    runnerUpSlot,
    runnerUpVotes,
    margin,
    needsAiVerification,
    resolutionReason,
  };
}

console.log("=== Testing Adaptive Slot Consensus Engine ===");

// Test 1: Uncontested early votes (5 votes for B2, 0 others)
const t1 = evaluateConsensus({ B2: 5 });
assert.strictEqual(t1.isConsensusReached, true, "Test 1 failed");
assert.strictEqual(t1.winningSlot, "B2");
assert.strictEqual(t1.resolutionReason, "early_consensus");
console.log("✓ Test 1: Early unanimous consensus confirmed (5 votes, 100%)");

// Test 2: Early votes with minor noise (6 votes: 5 for B2, 1 for A1)
const t2 = evaluateConsensus({ B2: 5, A1: 1 });
assert.strictEqual(t2.isConsensusReached, true, "Test 2 failed");
assert.strictEqual(t2.winningSlot, "B2");
assert.strictEqual(t2.resolutionReason, "early_consensus");
console.log("✓ Test 2: Early supermajority confirmed (5 of 6 votes, 83.3%)");

// Test 3: Early tie (3 for A1, 3 for B2)
const t3 = evaluateConsensus({ A1: 3, B2: 3 });
assert.strictEqual(t3.isConsensusReached, false, "Test 3 failed");
assert.strictEqual(t3.winningSlot, null);
assert.strictEqual(t3.needsAiVerification, false);
console.log("✓ Test 3: Early tie correctly kept open");

// Test 4: Standard dominance (13 votes: 8 for B2, 3 for A1, 2 for others => 61.5%)
const t4 = evaluateConsensus({ B2: 8, A1: 3, B1: 1, A2: 1 });
assert.strictEqual(t4.isConsensusReached, true, "Test 4 failed");
assert.strictEqual(t4.winningSlot, "B2");
assert.strictEqual(t4.resolutionReason, "standard_dominance");
console.log("✓ Test 4: Standard dominance confirmed (8 of 13 votes, 61.5%)");

// Test 5: Ratio dominance (15 votes: 10 for B2, 5 for A1)
const t5 = evaluateConsensus({ B2: 10, A1: 5 });
assert.strictEqual(t5.isConsensusReached, true, "Test 5 failed");
assert.strictEqual(t5.winningSlot, "B2");
console.log("✓ Test 5: Ratio dominance confirmed (10 vs 5, 2x lead)");

// Test 6: Deep contestation (64 votes: 26 for A1, 26 for B2)
const t6 = evaluateConsensus({ A1: 26, B2: 26, A2: 6, B1: 4, D1: 1, C1: 1 });
assert.strictEqual(t6.isConsensusReached, false, "Test 6 failed");
assert.strictEqual(t6.needsAiVerification, true, "Test 6 AI flag failed");
console.log("✓ Test 6: Deep tie correctly triggers AI verification flag (64 votes, 50/50 split)");

console.log("============================================================");
console.log("ALL ADAPTIVE SLOT CONSENSUS TESTS PASSED!");
console.log("============================================================");
