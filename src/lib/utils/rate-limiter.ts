import { redis } from "@/lib/utils/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { CustomError } from "./error";

function getClientIp(req: Request & { ip?: string}): string {
  const xff = req.headers.get("x-forwarded-for");
  if (typeof xff === "string" && xff.length > 0) {
    return xff.split(",")[0]?.trim()??"";
  }
  const xri = req.headers.get("x-real-ip");
  if (typeof xri === "string" && xri.length > 0) {
    return xri;
  }
  return "0.0.0.0";
}

export async function rateLimitCheck(req: Request & { ip?: string }, paperId: string) {
  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, "1 h"),//per id - 3 request - per hour
    analytics: true,
  });

  const ip = getClientIp(req);
  const key = `${ip}::${paperId}`;
  const { success } = await ratelimit.limit(key);

  if (!success) {
    throw new CustomError("Rate limit exceeded for reporting.", 429);
  }
}

export async function slotContributionRateLimitCheck(
  req: Request & { ip?: string },
  contributorId: string
) {
  try {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      return;
    }

    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "900 s"), // 20 contributions per 15 minutes
      analytics: true,
    });

    const ip = getClientIp(req);
    const key = `slot-contrib::${ip}::${contributorId}`;
    const { success } = await ratelimit.limit(key);

    if (!success) {
      throw new CustomError(
        "Rate limit exceeded. Please wait a few minutes before submitting more slot contributions.",
        429
      );
    }
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    // Fail-open on Redis connection errors in dev/local
    console.warn("[RateLimit] Slot contribution rate limit check bypassed:", err);
  }
}