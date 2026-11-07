import { Types } from "mongoose";
import { getPaperById } from "@/lib/services/paper";
import { failure } from "@/lib/utils/response";
import { cachedJsonEndpoint } from "@/lib/utils/edge-cache";
import { type IPaper } from "@/interface";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  if (!id || !Types.ObjectId.isValid(id)) {
    return failure("Invalid paper ID", 400);
  }

  const cleanId = id.trim();

  return cachedJsonEndpoint<IPaper | null>({
    request: req,
    cacheKeyPrefix: `api_paper_by_id_${cleanId}`,
    ttlSeconds: 3600, // 1 hour fresh TTL
    maxStaleAgeSeconds: 86400, // 24 hours max stale fallback
    errorMessage: "Failed to fetch paper",
    producer: async () => {
      try {
        return await getPaperById(cleanId);
      } catch (err: unknown) {
        if (err instanceof Error && err.message === "Paper not found") {
          return null;
        }
        throw err;
      }
    },
    validate: (data): data is IPaper => {
      return Boolean(
        data &&
          typeof data === "object" &&
          "_id" in data &&
          "subject" in data
      );
    },
  });
}
