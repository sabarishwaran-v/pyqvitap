import { NextResponse } from "next/server";
import { type ApiResponse } from "@/interface";

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Module-level in-memory cache shared within the active Worker isolate
const isolateMemoryCache = new Map<string, CacheEntry<unknown>>();

/**
 * Builds a deterministic query string from URLSearchParams.
 * - Trims whitespace from keys and values.
 * - Uses a stable sort on keys only, preserving the relative order of values
 *   for duplicate keys. This guarantees that requests with duplicate keys whose
 *   first value differs (as read by URLSearchParams.get()) receive separate cache keys.
 * - Deterministically normalizes equivalent query parameter orderings with distinct keys.
 */
export function buildNormalizedQueryString(searchParams: URLSearchParams): string {
  const entries: [string, string][] = [];
  searchParams.forEach((value, key) => {
    entries.push([key.trim(), value.trim()]);
  });

  if (entries.length === 0) return "";

  // Stable sort by key only to preserve original arrival order of duplicate key values
  entries.sort((a, b) => a[0].localeCompare(b[0]));

  const normalized = new URLSearchParams();
  for (const [key, value] of entries) {
    normalized.append(key, value);
  }
  return normalized.toString();
}

/**
 * Extracts a trustworthy original creation timestamp from a cached Response.
 * Checks X-Edge-Created-At, Date, and Age headers in order.
 * Falls back conservatively to (now - ttlMs) if no trustworthy metadata exists,
 * preventing unverified entries from gaining an artificial full-fresh TTL.
 */
export function extractResponseTimestamp(res: Response, ttlSeconds: number): number {
  const now = Date.now();

  // 1. High-fidelity internal generation header (millisecond epoch)
  const edgeCreatedHeader = res.headers.get("x-edge-created-at");
  if (edgeCreatedHeader) {
    const parsed = parseInt(edgeCreatedHeader, 10);
    if (!Number.isNaN(parsed) && parsed > 0 && parsed <= now) {
      return parsed;
    }
  }

  // 2. Standard HTTP Date header
  const dateHeader = res.headers.get("date");
  if (dateHeader) {
    const parsed = Date.parse(dateHeader);
    if (!Number.isNaN(parsed) && parsed > 0 && parsed <= now) {
      return parsed;
    }
  }

  // 3. Standard HTTP Age header
  const ageHeader = res.headers.get("age");
  if (ageHeader) {
    const ageSeconds = parseInt(ageHeader, 10);
    if (!Number.isNaN(ageSeconds) && ageSeconds >= 0) {
      const estimated = now - ageSeconds * 1000;
      if (estimated > 0 && estimated <= now) {
        return estimated;
      }
    }
  }

  // 4. Conservative fallback: assume the fresh TTL has already elapsed
  return now - ttlSeconds * 1000;
}

/**
 * Executes a read-only query with a two-tier caching strategy:
 * - Tier 1: In-memory isolate cache (< 0.05ms CPU, instant for all requests hitting the same isolate)
 * - Tier 2: Cloudflare Cache API (caches.default, edge-wide POP cache across isolates)
 * - Tier 3: Fresh producer execution (only executed on cache miss or expiration)
 *
 * Safety & Reliability Guarantees:
 * - Deterministic, query-aware cache keys preserving duplicate key arrival order.
 * - Explicit maximum stale age (maxStaleAgeSeconds): never serves stale data past this ceiling.
 * - Preserves edge response age when hydrating Tier 1 from Tier 2, preventing stale-age bypass.
 * - Stale-if-error: if producer throws and valid stale data within maxStaleAge exists, serves stale data.
 * - If both caches miss and database is unavailable, returns HTTP 500 with un-cached error headers.
 * - Never caches errors (4xx/5xx), exceptions, null, or invalid results.
 * - Bypasses cache when authorization or private session headers are present.
 * - Localhost / Node.js safe: gracefully falls back to in-memory caching when Cloudflare Cache API is absent.
 */
export async function cachedJsonEndpoint<T>({
  request,
  cacheKeyPrefix,
  ttlSeconds = 300, // 5 minutes fresh TTL
  maxStaleAgeSeconds = 86400, // 24 hours max stale age on DB failure
  producer,
  validate,
  errorMessage = "Internal server error",
}: {
  request: Request;
  cacheKeyPrefix: string;
  ttlSeconds?: number;
  maxStaleAgeSeconds?: number;
  producer: () => Promise<T>;
  validate?: (data: T) => boolean;
  errorMessage?: string;
}): Promise<Response> {
  // Bypass cache if request contains authentication or user-specific headers
  const isAuth =
    request.headers.has("authorization") ||
    request.headers.has("x-user-id");

  if (isAuth) {
    try {
      const authData = await producer();
      return NextResponse.json<ApiResponse<T>>(
        { status: "success", data: authData, message: "OK" },
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "private, no-cache, no-store, must-revalidate",
            "X-Cache": "BYPASS-AUTH",
          },
        }
      );
    } catch (authErr) {
      console.error(`[EdgeCache] Authenticated producer failed for ${cacheKeyPrefix}:`, authErr);
      return NextResponse.json<ApiResponse<null>>(
        { status: "error", data: null, message: errorMessage },
        {
          status: 500,
          headers: {
            "Cache-Control": "private, no-cache, no-store, must-revalidate",
            "X-Cache": "BYPASS-AUTH-ERROR",
          },
        }
      );
    }
  }

  const u = new URL(request.url);
  const normalizedQuery = buildNormalizedQueryString(u.searchParams);
  const memoryKey = normalizedQuery ? `${cacheKeyPrefix}:${normalizedQuery}` : cacheKeyPrefix;
  const normalizedCacheUrl = normalizedQuery
    ? `${u.origin}${u.pathname}?${normalizedQuery}`
    : `${u.origin}${u.pathname}`;

  const ttlMs = ttlSeconds * 1000;
  const maxStaleMs = maxStaleAgeSeconds * 1000;
  const now = Date.now();

  // 1. Check Tier 1 (In-Memory Isolate Cache)
  const memoryEntry = isolateMemoryCache.get(memoryKey) as CacheEntry<T> | undefined;
  if (memoryEntry && now - memoryEntry.timestamp < ttlMs) {
    return NextResponse.json<ApiResponse<T>>(
      { status: "success", data: memoryEntry.data, message: "OK" },
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": `public, max-age=60, s-maxage=${ttlSeconds}, stale-while-revalidate=86400`,
          "X-Cache": "HIT-MEMORY",
        },
      }
    );
  }

  // 2. Check Tier 2 (Cloudflare Cache API - caches.default)
  let cfCache: Cache | null = null;

  try {
    const defaultCache = (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default;
    if (defaultCache) {
      cfCache = defaultCache;
      const cacheReq = new Request(normalizedCacheUrl, { method: "GET" });
      const edgeMatch = await cfCache.match(cacheReq);

      if (edgeMatch) {
        const edgeTimestamp = extractResponseTimestamp(edgeMatch, ttlSeconds);
        const edgeAgeMs = now - edgeTimestamp;

        // Ensure edge entry has not exceeded maximum allowed stale age
        if (edgeAgeMs <= maxStaleMs) {
          // Clone edgeMatch BEFORE constructing res to avoid locking the stream
          const edgeMatchForHydration = edgeMatch.clone();
          const res = new Response(edgeMatch.body, edgeMatch);
          res.headers.set("X-Cache", "HIT-EDGE");

          // Hydrate Tier 1 in-memory cache with the preserved edge timestamp
          try {
            const rawJson: unknown = await edgeMatchForHydration.json();
            const apiRes = rawJson as ApiResponse<T>;
            if (apiRes?.data && (!validate || validate(apiRes.data))) {
              isolateMemoryCache.set(memoryKey, {
                data: apiRes.data,
                timestamp: edgeTimestamp,
              });
            }
          } catch (hydrationErr) {
            console.warn(
              `[EdgeCache] Failed hydrating Tier 1 from Tier 2 for ${memoryKey}:`,
              hydrationErr
            );
          }

          return res;
        } else {
          console.warn(
            `[EdgeCache] Tier 2 match for ${memoryKey} exceeded maxStaleAge (${Math.round(edgeAgeMs / 1000)}s > ${maxStaleAgeSeconds}s). Discarding.`
          );
        }
      }
    }
  } catch (err) {
    console.warn(`[EdgeCache] Error reading from Cloudflare Cache API for ${memoryKey}:`, err);
  }

  // 3. Tier 3: Execute Producer (Database query via withDatabase)
  try {
    const data = await producer();

    // Do not cache null, undefined, or empty results if invalid
    if (data === null || data === undefined) {
      return NextResponse.json<ApiResponse<null>>(
        { status: "error", data: null, message: "Resource not found" },
        {
          status: 404,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "X-Cache": "MISS-404",
          },
        }
      );
    }

    if (validate && !validate(data)) {
      return NextResponse.json<ApiResponse<null>>(
        { status: "error", data: null, message: "Invalid resource data" },
        {
          status: 502,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "X-Cache": "MISS-INVALID",
          },
        }
      );
    }

    const generationTime = Date.now();

    // Save to Tier 1 in-memory cache with exact generation timestamp
    isolateMemoryCache.set(memoryKey, {
      data,
      timestamp: generationTime,
    });

    const response = NextResponse.json<ApiResponse<T>>(
      { status: "success", data, message: "OK" },
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": `public, max-age=60, s-maxage=${ttlSeconds}, stale-while-revalidate=86400`,
          "X-Cache": "MISS",
          "X-Edge-Created-At": generationTime.toString(),
          "Date": new Date(generationTime).toUTCString(),
        },
      }
    );

    // Save to Tier 2 Cloudflare Cache API
    if (cfCache && normalizedCacheUrl) {
      try {
        const cacheReq = new Request(normalizedCacheUrl, { method: "GET" });
        await cfCache.put(cacheReq, response.clone());
      } catch (putErr) {
        console.warn(`[EdgeCache] Error writing to Cloudflare Cache API for ${memoryKey}:`, putErr);
      }
    }

    return response;
  } catch (producerError) {
    console.error(`[EdgeCache] Producer failed for ${memoryKey}:`, producerError);

    // Stale-if-error: only serve stale if entry exists AND is within maxStaleMs
    if (memoryEntry) {
      const staleAgeMs = now - memoryEntry.timestamp;
      if (staleAgeMs <= maxStaleMs) {
        return NextResponse.json<ApiResponse<T>>(
          { status: "success", data: memoryEntry.data, message: "OK (Stale Fallback)" },
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store, no-cache, must-revalidate",
              "X-Cache": "STALE-FALLBACK",
              "Warning": `110 - "Response is Stale (age: ${Math.round(staleAgeMs / 1000)}s)"`,
            },
          }
        );
      } else {
        console.warn(
          `[EdgeCache] Stale entry for ${memoryKey} exceeded maxStaleAge (${Math.round(staleAgeMs / 1000)}s > ${maxStaleAgeSeconds}s). Discarding.`
        );
        isolateMemoryCache.delete(memoryKey);
      }
    }

    return NextResponse.json<ApiResponse<null>>(
      { status: "error", data: null, message: errorMessage },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "X-Cache": "ERROR-NO-CACHE",
        },
      }
    );
  }
}

/**
 * Testing helpers: exposed only for test environments to inspect or reset isolate memory.
 */
export function _getIsolateMemoryCache(): Map<string, CacheEntry<unknown>> {
  return isolateMemoryCache;
}

export function _clearIsolateMemoryCache(): void {
  isolateMemoryCache.clear();
}
