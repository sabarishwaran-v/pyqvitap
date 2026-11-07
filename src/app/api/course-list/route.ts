import { getCourseList } from "@/lib/services/subject";
import { cachedJsonEndpoint } from "@/lib/utils/edge-cache";
import { type ICourse } from "@/interface";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return cachedJsonEndpoint<ICourse[]>({
    request,
    cacheKeyPrefix: "api_course_list",
    ttlSeconds: 3600, // 1 hour fresh edge TTL
    maxStaleAgeSeconds: 604800, // 7 days stale fallback on DB failure
    errorMessage: "Failed to fetch courses",
    producer: () => getCourseList(),
    validate: (data): data is ICourse[] => Array.isArray(data),
  });
}

