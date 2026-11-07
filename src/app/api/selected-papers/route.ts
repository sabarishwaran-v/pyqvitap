import { getSelectedPapers } from "@/lib/services/paper";
import { cachedJsonEndpoint } from "@/lib/utils/edge-cache";
import { type IPaper } from "@/interface";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return cachedJsonEndpoint<IPaper[]>({
    request,
    cacheKeyPrefix: "api_selected_papers",
    ttlSeconds: 1800, // 30 minutes fresh edge TTL
    maxStaleAgeSeconds: 86400, // 24 hours stale fallback on DB failure
    errorMessage: "Failed to fetch selected papers",
    producer: async () => {
      const papers = await getSelectedPapers();
      return papers as unknown as IPaper[];
    },
    validate: (data): data is IPaper[] => Array.isArray(data),
  });
}