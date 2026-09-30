import { Types } from "mongoose";
import Paper from "@/db/papers";
import SlotContribution from "@/db/slotContribution";
import { connectToDatabase } from "@/lib/database/mongoose";
import {
  AUTHORITATIVE_SLOTS,
  MIN_SLOT_CONSENSUS,
  MIN_SLOT_CONTRIBUTIONS,
  isValidSlot,
  isValidContributorId,
  normalizeSlot,
  type AuthoritativeSlot,
} from "@/lib/constants/slots";
import { CustomError } from "@/lib/utils/error";
import type { SlotCrowdsourceStatus } from "@/interface";

export interface ConsensusEvaluation {
  isConsensusReached: boolean;
  totalContributions: number;
  winningSlot: AuthoritativeSlot | null;
  winningPercentage: number;
  winningVotes: number;
  countsBySlot: Record<string, number>;
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
 * Pure consensus evaluation function based on PyqVitAp consensus rules:
 * 1. Count contributions by slot.
 * 2. Do NOT confirm anything before MIN_SLOT_CONTRIBUTIONS (10) total valid contributions.
 * 3. Once >= 10, find winning slot with highest count.
 * 4. winningVotes / totalContributions >= MIN_SLOT_CONSENSUS (0.70) => confirmed.
 * 5. Otherwise, keep collecting.
 */
export function evaluateConsensus(
  countsBySlot: Record<string, number>
): ConsensusEvaluation {
  let totalContributions = 0;
  let winningSlot: AuthoritativeSlot | null = null;
  let winningVotes = 0;

  for (const slot of AUTHORITATIVE_SLOTS) {
    const count = countsBySlot[slot] ?? 0;
    totalContributions += count;
    if (count > winningVotes) {
      winningVotes = count;
      winningSlot = slot;
    }
  }

  if (totalContributions < MIN_SLOT_CONTRIBUTIONS || !winningSlot || totalContributions === 0) {
    return {
      isConsensusReached: false,
      totalContributions,
      winningSlot: null,
      winningPercentage: totalContributions > 0 ? winningVotes / totalContributions : 0,
      winningVotes,
      countsBySlot,
    };
  }

  const ratio = winningVotes / totalContributions;
  const isConsensusReached = ratio >= MIN_SLOT_CONSENSUS;

  return {
    isConsensusReached,
    totalContributions,
    winningSlot: isConsensusReached ? winningSlot : null,
    winningPercentage: ratio,
    winningVotes,
    countsBySlot,
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

  await connectToDatabase();

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

  await connectToDatabase();

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

  // 5. If consensus reached, atomically update paper
  if (consensus.isConsensusReached && consensus.winningSlot) {
    const updated = await Paper.findOneAndUpdate(
      {
        _id: paperId,
        $or: [{ slot: "" }, { slot: null }, { slot: { $exists: false } }],
        slotSource: { $ne: "crowdsourced" },
      },
      {
        $set: {
          slot: consensus.winningSlot,
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
      confirmedSlot: updated?.slot ? (updated.slot as AuthoritativeSlot) : consensus.winningSlot,
      totalContributions: consensus.totalContributions,
      userSlot: normalizedSlot,
      message: `Consensus reached! Slot confirmed as ${consensus.winningSlot}.`,
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
}
