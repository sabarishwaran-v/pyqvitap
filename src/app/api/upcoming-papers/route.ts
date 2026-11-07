import { getUpcomingSubjects } from "@/lib/services/subject";
import { cachedJsonEndpoint } from "@/lib/utils/edge-cache";
import { type IUpcomingPaper } from "@/interface";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return cachedJsonEndpoint<IUpcomingPaper[]>({
    request,
    cacheKeyPrefix: "api_upcoming_papers",
    ttlSeconds: 1800, // 30 minutes fresh edge TTL
    maxStaleAgeSeconds: 86400, // 24 hours stale fallback on DB failure
    errorMessage: "Failed to fetch upcoming papers",
    producer: () => getUpcomingSubjects(),
    validate: (data): data is IUpcomingPaper[] => Array.isArray(data),
  });
}
