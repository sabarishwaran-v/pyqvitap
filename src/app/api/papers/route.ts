import { type NextRequest } from "next/server";
import { getPapersBySubject } from "@/lib/services/paper";
import { cachedJsonEndpoint } from "@/lib/utils/edge-cache";
import { failure } from "@/lib/utils/response";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams;
  const sub = url.get("subject");
  if (!sub?.trim()) {
    return failure("Subject query parameter is required", 400);
  }

  return cachedJsonEndpoint({
    request: req,
    cacheKeyPrefix: "api_papers",
    ttlSeconds: 900, // 15 minutes fresh TTL
    maxStaleAgeSeconds: 86400, // 24 hours max stale fallback
    errorMessage: "Failed to fetch papers",
    producer: async () => {
      return await getPapersBySubject(sub.trim());
    },
    validate: (data) => {
      return Boolean(
        data &&
          typeof data === "object" &&
          Array.isArray((data as { papers?: unknown[] }).papers)
      );
    },
  });
}
