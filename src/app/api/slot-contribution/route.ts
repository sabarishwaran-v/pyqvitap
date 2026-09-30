import {
  getSlotCrowdsourceStatus,
  submitSlotContribution,
} from "@/lib/services/slot-crowdsourcing";
import { slotContributionRateLimitCheck } from "@/lib/utils/rate-limiter";
import { success, failure } from "@/lib/utils/response";
import { customErrorHandler } from "@/lib/utils/error";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const paperId = url.searchParams.get("paperId");
    const contributorId = url.searchParams.get("contributorId") ?? undefined;

    if (!paperId) {
      return failure("paperId query parameter is required.", 400);
    }

    const status = await getSlotCrowdsourceStatus(paperId, contributorId);
    return success(status, "Status fetched successfully.", 200);
  } catch (err) {
    console.error("[SlotCrowdsource GET Error]:", err);
    return customErrorHandler(err, "Failed to retrieve slot crowdsourcing status.");
  }
}

export async function POST(req: Request & { ip?: string }) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return failure("Invalid JSON payload.", 400);
    }

    const { paperId, slot, contributorId } = body as {
      paperId?: unknown;
      slot?: unknown;
      contributorId?: unknown;
    };

    if (typeof paperId !== "string" || !paperId.trim()) {
      return failure("paperId is required and must be a string.", 400);
    }

    if (typeof slot !== "string" || !slot.trim()) {
      return failure("slot is required and must be a string.", 400);
    }

    if (typeof contributorId !== "string" || !contributorId.trim()) {
      return failure("contributorId is required and must be a string.", 400);
    }

    // Rate limiting check
    await slotContributionRateLimitCheck(req, contributorId.trim());

    // Submit contribution
    const result = await submitSlotContribution({
      paperId: paperId.trim(),
      slot: slot.trim(),
      contributorId: contributorId.trim(),
    });

    const statusCode = result.status === "confirmed" ? 200 : 201;
    return success(result, result.message, statusCode);
  } catch (err) {
    console.error("[SlotCrowdsource POST Error]:", err);
    return customErrorHandler(err, "Failed to process slot contribution.");
  }
}
