const mongoose = require("mongoose");
const { GoogleGenAI } = require("@google/genai");
require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: ".env" });

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
    if (count > 0) candidates.push({ slot, count });
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

async function detectSlotFromUrl(ai, fileUrl) {
  if (!fileUrl) return null;
  try {
    const match = fileUrl.match(/(papers\/.+)$/);
    const key = match ? match[1] : null;
    const fetchUrl = key
      ? `https://pyqvitap.site/api/media/${key}`
      : fileUrl;

    const res = await fetch(fetchUrl);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const base64 = Buffer.from(buf).toString("base64");

    const prompt = `You are an expert at reading VIT-AP examination question papers.
Look at the printed and handwritten examination header table on page 1 of this PDF:
- Look for the "Slot:" box/field in the table.
- Read the handwritten or printed slot value. Allowed authoritative slots: A1, A2, B1, B2, C1, C2, D1, D2, E1, E2, F1, F2, G1, G2.
Return ONLY valid JSON: {"slot": "SLOT_CODE"} or {"slot": null}.`;

    for (const model of ["gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-3.8-flash"]) {
      try {
        const aiRes = await ai.models.generateContent({
          model,
          contents: [{
            role: "user",
            parts: [
              { inlineData: { data: base64, mimeType: "application/pdf" } },
              { text: prompt },
            ],
          }],
        });
        const text = (aiRes.text || "{}").replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed.slot === "string") {
          const cleaned = parsed.slot.trim().toUpperCase();
          if (AUTHORITATIVE_SLOTS.includes(cleaned)) {
            return cleaned;
          }
        }
      } catch {
        // Continue to fallback model
      }
    }
  } catch (err) {
    console.warn("[AI Reader] Error:", err.message);
  }
  return null;
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

  console.log("=== RUNNING SLOT RESOLUTION ENGINE ===");

  const paperVotes = await db.collection("slot_contributions").aggregate([
    {
      $group: {
        _id: "$paperId",
        totalVotes: { $sum: 1 },
        slots: { $push: "$slot" },
      },
    },
    { $sort: { totalVotes: -1 } },
  ]).toArray();

  console.log(`Analyzing ${paperVotes.length} papers with contributions...`);

  let confirmedCount = 0;
  const confirmedList = [];

  for (const pv of paperVotes) {
    const paper = await db.collection("papers").findOne({ _id: pv._id });
    if (!paper) continue;

    // Skip papers that already have a non-crowdsourced authoritative slot
    if (paper.slot && paper.slotSource !== "crowdsourced") {
      continue;
    }

    const countsBySlot = {};
    for (const s of pv.slots) countsBySlot[s] = (countsBySlot[s] || 0) + 1;

    const consensus = evaluateConsensus(countsBySlot);
    let finalSlot = consensus.winningSlot;
    let confirmMethod = consensus.resolutionReason;

    // AI Fallback for contested papers (votes >= 12)
    if (!consensus.isConsensusReached && consensus.needsAiVerification && paper.file_url && ai) {
      console.log(`[AI Triggered] Paper ${pv._id} (${paper.subject}) has ${pv.totalVotes} votes in dispute. Scanning PDF...`);
      const aiSlot = await detectSlotFromUrl(ai, paper.file_url);
      if (aiSlot) {
        const votesForAi = countsBySlot[aiSlot] ?? 0;
        if (votesForAi >= 2 || votesForAi / pv.totalVotes >= 0.15) {
          finalSlot = aiSlot;
          confirmMethod = `ai_verified (AI: ${aiSlot}, Votes: ${votesForAi})`;
        }
      }
    }

    if (finalSlot) {
      await db.collection("papers").updateOne(
        { _id: pv._id },
        {
          $set: {
            slot: finalSlot,
            slotSource: "crowdsourced",
            slotConfirmedAt: new Date(),
            slotContributionCount: pv.totalVotes,
          },
        }
      );
      confirmedCount++;
      confirmedList.push({
        id: pv._id.toString(),
        subject: paper.subject,
        exam: paper.exam,
        year: paper.year,
        slot: finalSlot,
        votes: pv.totalVotes,
        method: confirmMethod,
      });
      console.log(`✓ CONFIRMED: ${paper.subject} (${paper.exam} ${paper.year}) -> Slot "${finalSlot}" via ${confirmMethod}`);
    } else {
      // Just update slotContributionCount
      await db.collection("papers").updateOne(
        { _id: pv._id },
        { $set: { slotContributionCount: pv.totalVotes } }
      );
    }
  }

  console.log("\n============================================================");
  console.log(`RESOLUTION COMPLETE: ${confirmedCount} papers successfully confirmed!`);
  console.log("============================================================");
  console.log(JSON.stringify(confirmedList, null, 2));

  await mongoose.disconnect();
}

main().catch(console.error);
