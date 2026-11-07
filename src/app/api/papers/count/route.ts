import { getCourseCounts } from "@/lib/services/paper";
import { cachedJsonEndpoint } from "@/lib/utils/edge-cache";
import { type ICourseCount } from "@/interface";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return cachedJsonEndpoint<ICourseCount[]>({
    request,
    cacheKeyPrefix: "api_papers_count",
    ttlSeconds: 3600, // 1 hour fresh edge TTL
    maxStaleAgeSeconds: 604800, // 7 days stale fallback on DB failure
    errorMessage: "Failed to fetch course counts",
    producer: () => getCourseCounts(),
    validate: (data): data is ICourseCount[] => Array.isArray(data),
  });
}

