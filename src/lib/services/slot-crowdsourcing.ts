import { Types } from "mongoose";
import Paper from "@/db/papers";
import SlotContribution from "@/db/slotContribution";
import { withDatabase } from "@/lib/database/mongoose";
import {
  AUTHORITATIVE_SLOTS,
  MIN_EARLY_VOTES,
  MIN_EARLY_CONSENSUS,
  MIN_STANDARD_VOTES,
  MIN_STANDARD_CONSENSUS,
  MIN_DOMINANCE_RATIO,
  MIN_DOMINANCE_MARGIN,
  MIN_AI_TRIGGER_VOTES,
  isValidSlot,
  isValidContributorId,
  normalizeSlot,
  type AuthoritativeSlot,
} from "@/lib/constants/slots";
import { detectSlotFromUrl } from "@/lib/services/slot-ai";
import { CustomError } from "@/lib/utils/error";
import type { SlotCrowdsourceStatus } from "@/interface";

export interface ConsensusEvaluation {
  isConsensusReached: boolean;
  totalContributions: number;
  winningSlot: AuthoritativeSlot | null;
  winningPercentage: number;
  winningVotes: number;
  runnerUpSlot: AuthoritativeSlot | null;
  runnerUpVotes: number;
  margin: number;
  countsBySlot: Record<string, number>;
  needsAiVerification: boolean;
  resolutionReason?: "early_consensus" | "standard_dominance" | "ratio_dominance";
}

export interface SubmitContributionResult {
  success: boolean;
  status: "recorded" | "confirmed";
  isConfirmed: boolean;
  confirmedSlot: AuthoritativeSlot | null;
  totalContributions: number;
  userSlot: AuthoritativeSlot;
  message: string;
}

/**
 * Pure consensus evaluation function based on the Adaptive Confidence Consensus (ACC) model:
 * 1. Early Fast-Path (5 to 9 votes): >= 75% consensus + 3-vote margin => confirm.
 * 2. Standard Dominance (>= 10 votes): >= 60% consensus + 3-vote margin OR 1.6x lead over 2nd place => confirm.
 * 3. Deep Contestation (>= 12 votes): If still deadlocked, triggers AI header table OCR tie-breaking.
 */
export function evaluateConsensus(
  countsBySlot: Record<string, number>
): ConsensusEvaluation {
  let totalContributions = 0;
  const candidates: Array<{ slot: AuthoritativeSlot; count: number }> = [];

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
  let resolutionReason: ConsensusEvaluation["resolutionReason"] = undefined;

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

  // Stage 3: Contested papers with >= 12 votes flag for AI verification
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
    countsBySlot,
    needsAiVerification,
    resolutionReason,
  };
}

/**
 * Retrieves the public crowdsourcing status of a given paper.
 */
export async function getSlotCrowdsourceStatus(
  paperId: string,
  contributorId?: string
): Promise<SlotCrowdsourceStatus> {
  if (!paperId || !Types.ObjectId.isValid(paperId)) {
    throw new CustomError("Invalid paper ID.", 400);
  }

  return await withDatabase(async () => {
    const paper = await Paper.findById(paperId).lean();
    if (!paper) {
      throw new CustomError("Paper not found.", 404);
    }

    const hasExistingSlot = Boolean(paper.slot && paper.slot.trim() !== "");
    const isCrowdsourcedConfirmed = paper.slotSource === "crowdsourced";

    if (hasExistingSlot || isCrowdsourcedConfirmed) {
      return {
        paperId,
        eligible: false,
        isConfirmed: true,
        currentSlot: paper.slot ?? "",
        slotSource: paper.slotSource ?? "dspace",
        slotConfirmedAt: paper.slotConfirmedAt ? new Date(paper.slotConfirmedAt).toISOString() : null,
        totalContributions: paper.slotContributionCount ?? 0,
        userContributed: false,
        userSlot: null,
      };
    }

    // Paper has no slot - crowdsourcing is eligible
    const totalContributions = await SlotContribution.countDocuments({
      paperId: new Types.ObjectId(paperId),
    });

    let userContributed = false;
    let userSlot: string | null = null;

    if (contributorId && isValidContributorId(contributorId)) {
      const userDoc = await SlotContribution.findOne({
        paperId: new Types.ObjectId(paperId),
        contributorId: contributorId.trim(),
      }).lean();

      if (userDoc) {
        userContributed = true;
        userSlot = userDoc.slot;
      }
    }

    return {
      paperId,
      eligible: true,
      isConfirmed: false,
      currentSlot: "",
      slotSource: null,
      slotConfirmedAt: null,
      totalContributions,
      userContributed,
      userSlot,
    };
  });
}

/**
 * Handles student slot contribution submission.
 */
export async function submitSlotContribution(input: {
  paperId: string;
  slot: string;
  contributorId: string;
}): Promise<SubmitContributionResult> {
  const { paperId, slot, contributorId } = input;

  if (!paperId || !Types.ObjectId.isValid(paperId)) {
    throw new CustomError("Invalid or missing paperId.", 400);
  }

  if (!isValidSlot(slot)) {
    throw new CustomError(
      `Invalid slot "${slot}". Allowed values are: ${AUTHORITATIVE_SLOTS.join(", ")}`,
      400
    );
  }

  if (!isValidContributorId(contributorId)) {
    throw new CustomError("Invalid or missing anonymous contributorId.", 400);
  }

  const normalizedSlot = normalizeSlot(slot);
  const cleanContributorId = contributorId.trim();

  return await withDatabase(async () => {
    // 1. Verify paper existence and eligibility
    const paper = await Paper.findById(paperId);
    if (!paper) {
      throw new CustomError("Paper not found.", 404);
    }

    if ((paper.slot && paper.slot.trim() !== "") || paper.slotSource === "crowdsourced") {
      throw new CustomError(
        "This paper already has an authoritative or confirmed slot. Slot contributions are no longer accepted.",
        400
      );
    }

    // 2. Insert contribution atomically (preventing duplicate votes via unique index)
    try {
      await SlotContribution.create({
        paperId: new Types.ObjectId(paperId),
        slot: normalizedSlot,
        contributorId: cleanContributorId,
      });
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "code" in err && (err as { code: number }).code === 11000) {
        throw new CustomError("You have already submitted a slot contribution for this paper.", 409);
      }
      throw err;
    }

    // 3. Aggregate vote counts for this paper
    const aggregation = await SlotContribution.aggregate<{ _id: string; count: number }>([
      { $match: { paperId: new Types.ObjectId(paperId) } },
      { $group: { _id: "$slot", count: { $sum: 1 } } },
    ]);

    const countsBySlot: Record<string, number> = {};
    for (const item of aggregation) {
      countsBySlot[item._id] = item.count;
    }

    // 4. Evaluate consensus
    const consensus = evaluateConsensus(countsBySlot);
    let isConfirmed = consensus.isConsensusReached;
    let confirmedSlot: AuthoritativeSlot | null = consensus.winningSlot;

    // 5. If not confirmed yet, but votes >= 12 and paper has file_url, try AI header scan
    if (!isConfirmed && consensus.needsAiVerification && paper.file_url) {
      try {
        const detectedAiSlot = await detectSlotFromUrl(paper.file_url);
        if (detectedAiSlot) {
          const aiVotes = countsBySlot[detectedAiSlot] ?? 0;
          // Validated if AI detected slot has support among student votes (>= 2 votes or >= 15%)
          if (
            aiVotes >= 2 ||
            (consensus.totalContributions > 0 &&
              aiVotes / consensus.totalContributions >= 0.15)
          ) {
            isConfirmed = true;
            confirmedSlot = detectedAiSlot;
          }
        }
      } catch (aiErr) {
        console.warn("[SlotCrowdsource] AI tie-breaker error:", aiErr);
      }
    }

    // 6. If consensus reached or AI confirmed, atomically update paper
    if (isConfirmed && confirmedSlot) {
      const updated = await Paper.findOneAndUpdate(
        {
          _id: paperId,
          $or: [{ slot: "" }, { slot: null }, { slot: { $exists: false } }],
          slotSource: { $ne: "crowdsourced" },
        },
        {
          $set: {
            slot: confirmedSlot,
            slotSource: "crowdsourced",
            slotConfirmedAt: new Date(),
            slotContributionCount: consensus.totalContributions,
          },
        },
        { new: true }
      );

      return {
        success: true,
        status: "confirmed",
        isConfirmed: true,
        confirmedSlot: updated?.slot
          ? (updated.slot as AuthoritativeSlot)
          : confirmedSlot,
        totalContributions: consensus.totalContributions,
        userSlot: normalizedSlot,
        message: `Consensus reached! Slot confirmed as ${confirmedSlot}.`,
      };
    }

    // Consensus not reached yet: update contribution count on paper for fast indexing
    await Paper.updateOne(
      {
        _id: paperId,
        $or: [{ slot: "" }, { slot: null }, { slot: { $exists: false } }],
      },
      {
        $set: { slotContributionCount: consensus.totalContributions },
      }
    );

    return {
      success: true,
      status: "recorded",
      isConfirmed: false,
      confirmedSlot: null,
      totalContributions: consensus.totalContributions,
      userSlot: normalizedSlot,
      message: "Thanks! Your contribution was recorded.",
    };
  });
}
