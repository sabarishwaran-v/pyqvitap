import { getCloudflareContext } from "@opennextjs/cloudflare";
import { isAuthEnabled, isAuthorizedEmail } from "@/config/auth";
import { isCloudinaryFallbackEnabled } from "@/config/media";
import { auth, createClerkClient } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

interface SessionClaimsWithEmail {
  email?: string;
  primaryEmail?: string;
  user_email?: string;
  primary_email_address?: string;
  email_verified?: boolean;
}

interface CachedUserAuth {
  email: string;
  isAuthorized: boolean;
  expiresAt: number;
}

const mediaUserAuthCache = new Map<string, CachedUserAuth>();
const MEDIA_USER_CACHE_TTL_MS = 5 * 60 * 1000;

async function verifyMediaAuth(req?: Request): Promise<Response | null> {
  const authEnabled = await isAuthEnabled(req);
  if (!authEnabled) {
    return null;
  }

  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) {
    return new Response(
      JSON.stringify({ error: "Unauthorized", message: "Authentication configuration missing" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const session = await auth();
    if (!session || !session.userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", message: "Authentication required to access media" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const claims = session.sessionClaims as (SessionClaimsWithEmail & Record<string, unknown>) | null;
    let email =
      claims?.email ??
      claims?.primaryEmail ??
      claims?.user_email ??
      claims?.primary_email_address ??
      "";

    let isEmailVerified = false;
    let isAuthorized = false;

    // Tier 1: Check cryptographic JWT session claims (0ms, 0 external network requests)
    if (email && isAuthorizedEmail(email)) {
      const claimVerified = (claims as Record<string, unknown>)?.email_verified;
      if (claimVerified !== false) {
        email = email.trim().toLowerCase();
        isEmailVerified = true;
        isAuthorized = true;
      }
    }

    // Tier 2: Check in-memory isolate cache (0ms, 0 external network requests)
    if (!isAuthorized && session.userId) {
      const cached = mediaUserAuthCache.get(session.userId);
      if (cached && cached.expiresAt > Date.now()) {
        email = cached.email;
        isAuthorized = cached.isAuthorized;
        isEmailVerified = cached.isAuthorized;
      }
    }

    // Tier 3: Fetch from Clerk API only when uncached
    if (!isAuthorized && process.env.CLERK_SECRET_KEY && session.userId) {
      try {
        const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
        const user = await clerk.users.getUser(session.userId);

        const verifiedAllowedEmail = user.emailAddresses.find((e) => {
          const isVerified = e.verification?.status === "verified";
          return isVerified && isAuthorizedEmail(e.emailAddress);
        });

        if (verifiedAllowedEmail) {
          email = verifiedAllowedEmail.emailAddress;
          isEmailVerified = true;
          isAuthorized = true;
        } else {
          const primaryEmailId = user.primaryEmailAddressId;
          const primaryObj = user.emailAddresses.find((e) => e.id === primaryEmailId);
          email = primaryObj?.emailAddress ?? email;
          isEmailVerified = primaryObj?.verification?.status === "verified";
          isAuthorized = isAuthorizedEmail(email) && isEmailVerified;
        }

        if (mediaUserAuthCache.size > 2000) {
          mediaUserAuthCache.clear();
        }
        mediaUserAuthCache.set(session.userId, {
          email,
          isAuthorized,
          expiresAt: Date.now() + (isAuthorized ? MEDIA_USER_CACHE_TTL_MS : 60_000),
        });
      } catch (lookupErr) {
        console.error("[Media Gateway Auth] Failed to lookup user primary email:", lookupErr);
      }
    } else if (!isAuthorized && !process.env.CLERK_SECRET_KEY) {
      isEmailVerified = isAuthorizedEmail(email);
      isAuthorized = isEmailVerified;
    }

    if (!isAuthorized) {
      if (session.sessionId && process.env.CLERK_SECRET_KEY) {
        try {
          const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
          await clerk.sessions.revokeSession(session.sessionId);
        } catch {}
      }

      return new Response(
        JSON.stringify({
          error: "Forbidden",
          message: "Access restricted to verified @vitapstudent.ac.in accounts",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    return null;
  } catch (err) {
    console.error("[Media Gateway Auth Exception]", err);
    return new Response(
      JSON.stringify({ error: "Unauthorized", message: "Authentication verification failed" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
}

function inferContentType(key: string): string {
  if (key.endsWith(".pdf")) return "application/pdf";
  if (key.endsWith(".webp")) return "image/webp";
  if (key.endsWith(".png")) return "image/png";
  if (key.endsWith(".jpg") || key.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}

function inferMediaType(key: string): "pdf" | "thumbnail" {
  if (key.endsWith(".pdf") || key.includes("/pdfs/")) {
    return "pdf";
  }
  return "thumbnail";
}

function getCacheControl(key: string, contentType: string): string {
  // STRICT SECURITY REQUIREMENT:
  // Protected PDFs must NEVER be publicly cached.
  if (key.endsWith(".pdf") || contentType === "application/pdf") {
    return "private, no-store";
  }
  // Thumbnails: edge POP caching (s-maxage=1y) + browser caching (7d)
  if (key.endsWith(".webp") || contentType.startsWith("image/")) {
    return "public, max-age=604800, s-maxage=31536000, stale-while-revalidate=86400";
  }
  return "private, no-store";
}

function isSafeKey(segments: string[]): boolean {
  if (!segments || segments.length === 0) return false;

  for (const segment of segments) {
    if (!segment) return false;
    // Check for traversal or path tampering
    if (segment === "." || segment === ".." || segment.includes("\\") || segment.includes("\0")) {
      return false;
    }
  }

  const key = segments.join("/");
  // Whitelist safe path characters: alphanumeric, _, -, ., /
  if (!/^[a-zA-Z0-9_\-\.\/]+$/.test(key)) {
    return false;
  }

  // Ensure key resides within known media folders
  if (!key.startsWith("papers/")) {
    return false;
  }

  return true;
}

async function getR2Bucket(): Promise<R2Bucket | undefined> {
  try {
    const ctx = getCloudflareContext();
    if (ctx?.env?.R2_MEDIA) return ctx.env.R2_MEDIA;
  } catch {
    // In Node.js development without pre-bound worker global, resolve asynchronously via wrangler
  }

  try {
    if (!process.env.NEXT_RUNTIME && typeof window === "undefined") {
      process.env.NEXT_RUNTIME = "nodejs";
    }
    const ctx = await getCloudflareContext({ async: true });
    return ctx?.env?.R2_MEDIA;
  } catch {
    return undefined;
  }
}

function parseR2ObjectRange(
  range: R2Range,
  totalSize: number
): { start: number; end: number; length: number } {
  let start = 0;
  let length = totalSize;

  if ("suffix" in range && typeof range.suffix === "number") {
    const actualSuffix = Math.min(Math.max(0, range.suffix), totalSize);
    start = totalSize - actualSuffix;
    length = actualSuffix;
  } else if ("offset" in range && typeof range.offset === "number") {
    start = Math.max(0, range.offset);
    if ("length" in range && typeof range.length === "number") {
      length = Math.max(0, range.length);
    } else {
      length = Math.max(0, totalSize - start);
    }
  } else if ("length" in range && typeof range.length === "number") {
    start = 0;
    length = Math.max(0, range.length);
  }

  const end = totalSize > 0 ? Math.min(start + length - 1, totalSize - 1) : 0;
  const actualLength = totalSize > 0 && end >= start ? end - start + 1 : 0;

  return {
    start,
    end,
    length: actualLength,
  };
}

function parseByteRange(
  rangeHeader: string,
  totalSize: number
): {
  type: "satisfiable" | "unsatisfiable" | "invalid";
  range?: R2Range;
} {
  const match = /^bytes=\s*(\d*)\s*-\s*(\d*)\s*$/i.exec(rangeHeader.trim());
  if (!match) {
    return { type: "invalid" };
  }

  const [, startStr, endStr] = match;
  if (!startStr && !endStr) {
    return { type: "invalid" };
  }

  if (!startStr) {
    if (!endStr) return { type: "invalid" };
    const suffix = parseInt(endStr, 10);
    if (isNaN(suffix) || suffix <= 0) return { type: "unsatisfiable" };
    return {
      type: "satisfiable",
      range: { suffix },
    };
  }

  const start = parseInt(startStr, 10);
  if (isNaN(start) || start < 0) return { type: "invalid" };

  if (start >= totalSize) {
    return { type: "unsatisfiable" };
  }

  if (!endStr) {
    return {
      type: "satisfiable",
      range: { offset: start },
    };
  }

  const end = parseInt(endStr, 10);
  if (isNaN(end) || end < start) {
    return { type: "unsatisfiable" };
  }

  const length = Math.min(end, totalSize - 1) - start + 1;
  return {
    type: "satisfiable",
    range: { offset: start, length },
  };
}

const PDF_CACHE_TTL_SECONDS = 3600; // 1 hour conservative Worker Cache API TTL
const MEDIA_CACHE_KEY_PREFIX = "https://cache.pyqvitap.internal/media-pdf-v1/";

function getWorkerCache(): Cache | null {
  try {
    if (typeof caches !== "undefined" && caches && "default" in caches) {
      return (caches as unknown as { default: Cache }).default;
    }
  } catch {}
  return null;
}

function buildMediaCacheKey(key: string): string {
  return `${MEDIA_CACHE_KEY_PREFIX}${key}`;
}

function matchIfMatch(headerValue: string, targetETag: string | null): boolean {
  if (!targetETag) return false;
  const cleanHeader = headerValue.trim();
  if (cleanHeader === "*") return true;
  // RFC 9110 §13.1.1: If-Match requires a strong comparison; weak entity tags never match.
  if (targetETag.startsWith("W/")) return false;

  const candidates = cleanHeader.split(",").map((c) => c.trim());
  return candidates.some((c) => c === targetETag && !c.startsWith("W/"));
}

function matchIfNoneMatch(headerValue: string, targetETag: string | null): boolean {
  if (!targetETag) return false;
  const cleanHeader = headerValue.trim();
  if (cleanHeader === "*") return true;

  // RFC 9110 §13.1.2: Weak comparison is permitted for GET/HEAD with If-None-Match.
  const normTarget = targetETag.replace(/^W\//, "").trim();
  const candidates = cleanHeader.split(",").map((c) => c.trim());
  return candidates.some((c) => {
    if (c === "*") return true;
    const normCandidate = c.replace(/^W\//, "").trim();
    return normCandidate === normTarget;
  });
}

function isModifiedSince(lastModifiedHeader: string | null, dateHeaderValue: string): boolean | null {
  if (!lastModifiedHeader) return null;
  const lastModifiedTime = Date.parse(lastModifiedHeader);
  const clientTime = Date.parse(dateHeaderValue);
  if (isNaN(lastModifiedTime) || isNaN(clientTime)) return null;

  // HTTP dates have 1-second resolution
  const lmSec = Math.floor(lastModifiedTime / 1000);
  const clientSec = Math.floor(clientTime / 1000);
  return lmSec > clientSec;
}

export async function GET(
  req: Request,
  { params }: { params: { path: string[] } }
) {
  const authResponse = await verifyMediaAuth(req);
  if (authResponse) {
    return authResponse;
  }

  const segments = params.path;

  if (!isSafeKey(segments)) {
    return new Response("Invalid or unsafe media key", { status: 400 });
  }

  const key = segments.join("/");
  const hasRange = req.headers.has("range");
  const isPdf = inferMediaType(key) === "pdf";
  const isEligibleForCache = isPdf && !hasRange;
  const cacheKeyUrl = isEligibleForCache ? buildMediaCacheKey(key) : null;
  const cfCache = isEligibleForCache ? getWorkerCache() : null;

  // 1. Worker Cache API Lookup (for eligible full PDF GET requests)
  if (cfCache && cacheKeyUrl) {
    try {
      const cached = await cfCache.match(cacheKeyUrl);
      if (cached && cached.body) {
        // RFC 9110 §13.2.2: Precedence of HTTP Conditional Requests
        const ifMatch = req.headers.get("if-match");
        const ifUnmodifiedSince = req.headers.get("if-unmodified-since");
        const ifNoneMatch = req.headers.get("if-none-match");
        const ifModifiedSince = req.headers.get("if-modified-since");

        const cachedEtag = cached.headers.get("etag");
        const cachedLastModified = cached.headers.get("last-modified");

        // Step 1: If-Match
        if (ifMatch) {
          if (!matchIfMatch(ifMatch, cachedEtag)) {
            const headers = new Headers();
            headers.set("Cache-Control", "private, no-store");
            headers.set("Accept-Ranges", "bytes");
            headers.set("X-Content-Type-Options", "nosniff");
            if (cachedEtag) headers.set("ETag", cachedEtag);
            if (cachedLastModified) headers.set("Last-Modified", cachedLastModified);
            return new Response(null, { status: 412, headers });
          }
          // If-Match matched: Step 2 (If-Unmodified-Since) is ignored per RFC 9110 §13.2.2
        } else if (ifUnmodifiedSince) {
          // Step 2: If-Unmodified-Since (only if If-Match is absent)
          const modified = isModifiedSince(cachedLastModified, ifUnmodifiedSince);
          if (modified === true) {
            const headers = new Headers();
            headers.set("Cache-Control", "private, no-store");
            headers.set("Accept-Ranges", "bytes");
            headers.set("X-Content-Type-Options", "nosniff");
            if (cachedEtag) headers.set("ETag", cachedEtag);
            if (cachedLastModified) headers.set("Last-Modified", cachedLastModified);
            return new Response(null, { status: 412, headers });
          }
        }

        // Step 3: If-None-Match
        if (ifNoneMatch) {
          if (matchIfNoneMatch(ifNoneMatch, cachedEtag)) {
            const headers = new Headers(cached.headers);
            headers.set("Cache-Control", "private, no-store");
            headers.set("Accept-Ranges", "bytes");
            headers.set("X-Content-Type-Options", "nosniff");
            headers.set("X-Cache", "HIT-WORKER-304");
            return new Response(null, { status: 304, headers });
          }
          // If-None-Match did not match: Step 4 (If-Modified-Since) is ignored per RFC 9110 §13.2.2
        } else if (ifModifiedSince) {
          // Step 4: If-Modified-Since (only if If-None-Match is absent)
          const modified = isModifiedSince(cachedLastModified, ifModifiedSince);
          if (modified === false) {
            const headers = new Headers(cached.headers);
            headers.set("Cache-Control", "private, no-store");
            headers.set("Accept-Ranges", "bytes");
            headers.set("X-Content-Type-Options", "nosniff");
            headers.set("X-Cache", "HIT-WORKER-304");
            return new Response(null, { status: 304, headers });
          }
        }

        // Step 5: Preconditions passed / not present: return cached 200 representation
        const headers = new Headers(cached.headers);
        // STRICT SECURITY REQUIREMENT:
        // Downstream client response must ALWAYS be private, no-store
        headers.set("Cache-Control", "private, no-store");
        headers.set("Accept-Ranges", "bytes");
        headers.set("X-Content-Type-Options", "nosniff");
        headers.set("X-Cache", "HIT-WORKER");

        return new Response(cached.body, { status: 200, headers });
      }
    } catch (cacheLookupErr) {
      console.warn(`[Media Gateway Cache] Lookup error for ${key}:`, cacheLookupErr);
    }
  }

  // 2. Try fetching from Cloudflare R2 bucket binding
  let r2Error: unknown = null;
  try {
    const r2Bucket = await getR2Bucket();

    if (r2Bucket) {
      const hasRange = req.headers.has("range");
      let r2Object: R2ObjectBody | R2Object | null = null;

      try {
        r2Object = await r2Bucket.get(key, {
          onlyIf: req.headers,
          ...(hasRange ? { range: req.headers } : {}),
        });
      } catch (getErr) {
        if (hasRange) {
          r2Object = null;
        } else {
          throw getErr;
        }
      }

      // Check if conditional headers matched (e.g. If-None-Match matches ETag)
      // When onlyIf condition is not satisfied, R2 returns an R2Object with no body
      if (r2Object && !("body" in r2Object && r2Object.body)) {
        const contentType =
          r2Object.httpMetadata?.contentType ?? inferContentType(key);
        const cacheControl = getCacheControl(key, contentType);

        const headers = new Headers();
        headers.set("Content-Type", contentType);
        headers.set("Cache-Control", cacheControl);
        headers.set("Accept-Ranges", "bytes");
        headers.set("X-Content-Type-Options", "nosniff");

        if (r2Object.httpEtag) {
          headers.set("ETag", r2Object.httpEtag);
        }
        if (r2Object.uploaded) {
          headers.set("Last-Modified", r2Object.uploaded.toUTCString());
        }

        if (req.headers.has("if-match") || req.headers.has("if-unmodified-since")) {
          return new Response(null, { status: 412, headers });
        }

        return new Response(null, { status: 304, headers });
      }

      // If object was returned with body:
      if (r2Object && "body" in r2Object && r2Object.body) {
        const contentType =
          r2Object.httpMetadata?.contentType ?? inferContentType(key);
        const cacheControl = getCacheControl(key, contentType);

        const headers = new Headers();
        headers.set("Content-Type", contentType);
        headers.set("Cache-Control", cacheControl);
        headers.set("Accept-Ranges", "bytes");
        headers.set("X-Content-Type-Options", "nosniff");

        if (r2Object.httpEtag) {
          headers.set("ETag", r2Object.httpEtag);
        }
        if (r2Object.uploaded) {
          headers.set("Last-Modified", r2Object.uploaded.toUTCString());
        }

        if (r2Object.range) {
          const { start, end, length } = parseR2ObjectRange(
            r2Object.range,
            r2Object.size
          );
          headers.set("Content-Range", `bytes ${start}-${end}/${r2Object.size}`);
          headers.set("Content-Length", length.toString());

          return new Response(r2Object.body, { status: 206, headers });
        }

        headers.set("Content-Length", r2Object.size.toString());

        // Cache eligible complete PDF responses in Worker Cache API
        if (cfCache && cacheKeyUrl && isEligibleForCache && r2Object.body) {
          try {
            const [clientStream, cacheStream] = r2Object.body.tee();
            const internalCacheHeaders = new Headers(headers);
            internalCacheHeaders.set("Cache-Control", `max-age=${PDF_CACHE_TTL_SECONDS}`);

            const cacheResponse = new Response(cacheStream, {
              status: 200,
              headers: internalCacheHeaders,
            });

            const putPromise = cfCache.put(cacheKeyUrl, cacheResponse);
            try {
              const ctx = getCloudflareContext();
              if (ctx?.ctx?.waitUntil) {
                ctx.ctx.waitUntil(putPromise);
              } else {
                putPromise.catch(() => {});
              }
            } catch {
              putPromise.catch(() => {});
            }

            headers.set("X-Cache", "MISS");
            return new Response(clientStream, { status: 200, headers });
          } catch (teeErr) {
            console.warn(`[Media Gateway Cache] Error teeing R2 stream for ${key}:`, teeErr);
          }
        }

        return new Response(r2Object.body, { status: 200, headers });
      }

      // If r2Object is null and Range was requested, verify whether the asset exists in R2
      if (!r2Object && hasRange) {
        const head = await r2Bucket.head(key);
        if (head) {
          const contentType =
            head.httpMetadata?.contentType ?? inferContentType(key);
          const cacheControl = getCacheControl(key, contentType);
          const rangeHeader = req.headers.get("range") ?? "";
          const parsedRange = parseByteRange(rangeHeader, head.size);

          if (parsedRange.type === "unsatisfiable") {
            const headers = new Headers();
            headers.set("Content-Type", contentType);
            headers.set("Cache-Control", cacheControl);
            headers.set("Accept-Ranges", "bytes");
            headers.set("Content-Range", `bytes */${head.size}`);
            headers.set("X-Content-Type-Options", "nosniff");
            if (head.httpEtag) headers.set("ETag", head.httpEtag);

            return new Response(null, { status: 416, headers });
          }

          if (parsedRange.type === "satisfiable" && parsedRange.range) {
            try {
              const rangedObj = await r2Bucket.get(key, {
                range: parsedRange.range,
                onlyIf: req.headers,
              });
              if (rangedObj && !("body" in rangedObj && rangedObj.body)) {
                const headers = new Headers();
                headers.set("Content-Type", contentType);
                headers.set("Cache-Control", cacheControl);
                headers.set("Accept-Ranges", "bytes");
                headers.set("X-Content-Type-Options", "nosniff");
                if (rangedObj.httpEtag) headers.set("ETag", rangedObj.httpEtag);
                return new Response(null, { status: 304, headers });
              }
              if (rangedObj && "body" in rangedObj && rangedObj.body) {
                const headers = new Headers();
                headers.set("Content-Type", contentType);
                headers.set("Cache-Control", cacheControl);
                headers.set("Accept-Ranges", "bytes");
                headers.set("X-Content-Type-Options", "nosniff");
                if (rangedObj.httpEtag) headers.set("ETag", rangedObj.httpEtag);
                if (rangedObj.uploaded) headers.set("Last-Modified", rangedObj.uploaded.toUTCString());

                const rangeToParse = rangedObj.range ?? parsedRange.range;
                const { start, end, length } = parseR2ObjectRange(rangeToParse, rangedObj.size);
                headers.set("Content-Range", `bytes ${start}-${end}/${rangedObj.size}`);
                headers.set("Content-Length", length.toString());

                return new Response(rangedObj.body, { status: 206, headers });
              }
            } catch {}
          }

          // RFC 9110: Ignore invalid Range header and return full file (200)
          const fallbackFullObj = await r2Bucket.get(key, { onlyIf: req.headers });
          if (fallbackFullObj && !("body" in fallbackFullObj && fallbackFullObj.body)) {
            const headers = new Headers();
            headers.set("Content-Type", contentType);
            headers.set("Cache-Control", cacheControl);
            headers.set("Accept-Ranges", "bytes");
            headers.set("X-Content-Type-Options", "nosniff");
            if (fallbackFullObj.httpEtag) headers.set("ETag", fallbackFullObj.httpEtag);
            return new Response(null, { status: 304, headers });
          }
          if (fallbackFullObj && "body" in fallbackFullObj && fallbackFullObj.body) {
            const headers = new Headers();
            headers.set("Content-Type", contentType);
            headers.set("Cache-Control", cacheControl);
            headers.set("Accept-Ranges", "bytes");
            headers.set("X-Content-Type-Options", "nosniff");
            headers.set("Content-Length", fallbackFullObj.size.toString());
            if (fallbackFullObj.httpEtag) headers.set("ETag", fallbackFullObj.httpEtag);
            if (fallbackFullObj.uploaded) headers.set("Last-Modified", fallbackFullObj.uploaded.toUTCString());

            return new Response(fallbackFullObj.body, { status: 200, headers });
          }
        }
      }
    }
  } catch (err) {
    r2Error = err;
    console.error(`[Media Gateway] R2 read error for key "${key}":`, r2Error);
  }

  // 2. Check if Cloudinary Fallback is Enabled
  const fallbackEnabled = await isCloudinaryFallbackEnabled();
  const reason = r2Error ? "r2_error" : "not_found";

  if (!fallbackEnabled) {
    if (process.env.NODE_ENV === "development") {
      try {
        const prodRes = await fetch(`https://pyqvitap.site/api/media/${key}`);
        if (prodRes.ok && prodRes.body) {
          const headers = new Headers(prodRes.headers);
          return new Response(prodRes.body, {
            status: prodRes.status,
            headers,
          });
        }
      } catch {}
    }

    console.warn(
      JSON.stringify({
        event: "media_r2_failure",
        reason,
        fallback_enabled: false,
        key,
      })
    );

    if (r2Error) {
      return new Response("Media retrieval error", { status: 500 });
    }
    return new Response("Media not found", { status: 404 });
  }

  // 3. Fallback is Enabled: Structured Fallback Log (Observability)
  console.info(
    JSON.stringify({
      event: "media_fallback",
      primary: "r2",
      fallback: "cloudinary",
      reason,
      media_type: inferMediaType(key),
      key,
    })
  );

  // 4. Server-side Cloudinary Fallback (NO REDIRECTS to client)
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    console.error("[Media Gateway] CLOUDINARY_CLOUD_NAME is not configured");
    return new Response("Media storage configuration error", { status: 500 });
  }

  const isRaw =
    key.endsWith(".pdf") ||
    key.startsWith("papers/pdfs/") ||
    key.startsWith("papers/unapproved/");
  const cloudinaryUrl = `https://res.cloudinary.com/${cloudName}/${isRaw ? "raw" : "image"}/upload/${key}`;

  try {
    const fetchHeaders = new Headers();
    const rangeHeader = req.headers.get("range");
    if (rangeHeader) {
      fetchHeaders.set("range", rangeHeader);
    }
    const ifNoneMatch = req.headers.get("if-none-match");
    if (ifNoneMatch) {
      fetchHeaders.set("if-none-match", ifNoneMatch);
    }
    const ifModifiedSince = req.headers.get("if-modified-since");
    if (ifModifiedSince) {
      fetchHeaders.set("if-modified-since", ifModifiedSince);
    }

    const cldResponse = await fetch(cloudinaryUrl, { headers: fetchHeaders });

    if (cldResponse.status === 304) {
      const contentType =
        cldResponse.headers.get("content-type") ?? inferContentType(key);
      const cacheControl = getCacheControl(key, contentType);

      const headers = new Headers();
      headers.set("Content-Type", contentType);
      headers.set("Cache-Control", cacheControl);
      headers.set("Accept-Ranges", "bytes");
      headers.set("X-Content-Type-Options", "nosniff");
      const etag = cldResponse.headers.get("etag");
      if (etag) headers.set("ETag", etag);
      const lastModified = cldResponse.headers.get("last-modified");
      if (lastModified) headers.set("Last-Modified", lastModified);

      return new Response(null, { status: 304, headers });
    }

    if (cldResponse.status === 416) {
      const contentType =
        cldResponse.headers.get("content-type") ?? inferContentType(key);
      const cacheControl = getCacheControl(key, contentType);

      const headers = new Headers();
      headers.set("Content-Type", contentType);
      headers.set("Cache-Control", cacheControl);
      headers.set("Accept-Ranges", "bytes");
      headers.set("X-Content-Type-Options", "nosniff");
      const contentRange = cldResponse.headers.get("content-range");
      if (contentRange) headers.set("Content-Range", contentRange);

      return new Response(null, { status: 416, headers });
    }

    if (!cldResponse.ok || !cldResponse.body) {
      if (cldResponse.status === 404) {
        return new Response("Media not found", { status: 404 });
      }
      return new Response("Upstream media error", { status: cldResponse.status });
    }

    // Structured Fallback Success Log
    console.info(
      JSON.stringify({
        event: "media_fallback_success",
        primary: "r2",
        fallback: "cloudinary",
        key,
      })
    );

    const contentType =
      cldResponse.headers.get("content-type") ?? inferContentType(key);
    const cacheControl = getCacheControl(key, contentType);

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Cache-Control", cacheControl);
    headers.set("Accept-Ranges", "bytes");
    headers.set("X-Content-Type-Options", "nosniff");

    const contentLength = cldResponse.headers.get("content-length");
    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }
    const contentRange = cldResponse.headers.get("content-range");
    if (contentRange) {
      headers.set("Content-Range", contentRange);
    }
    const etag = cldResponse.headers.get("etag");
    if (etag) {
      headers.set("ETag", etag);
    }
    const lastModified = cldResponse.headers.get("last-modified");
    if (lastModified) {
      headers.set("Last-Modified", lastModified);
    }

    // Cache complete successful PDF responses from Cloudinary fallback
    if (cfCache && cacheKeyUrl && isEligibleForCache && cldResponse.status === 200 && cldResponse.body) {
      try {
        const [clientStream, cacheStream] = cldResponse.body.tee();
        const internalCacheHeaders = new Headers(headers);
        internalCacheHeaders.set("Cache-Control", `max-age=${PDF_CACHE_TTL_SECONDS}`);

        const cacheResponse = new Response(cacheStream, {
          status: 200,
          headers: internalCacheHeaders,
        });

        const putPromise = cfCache.put(cacheKeyUrl, cacheResponse);
        try {
          const ctx = getCloudflareContext();
          if (ctx?.ctx?.waitUntil) {
            ctx.ctx.waitUntil(putPromise);
          } else {
            putPromise.catch(() => {});
          }
        } catch {
          putPromise.catch(() => {});
        }

        headers.set("X-Cache", "MISS-CLOUDINARY");
        return new Response(clientStream, { status: 200, headers });
      } catch (teeErr) {
        console.warn(`[Media Gateway Cache] Error teeing Cloudinary stream for ${key}:`, teeErr);
      }
    }

    // Stream Cloudinary bytes directly through the Worker gateway (status 200 or 206)
    return new Response(cldResponse.body, { status: cldResponse.status, headers });
  } catch (fallbackError) {
    console.error(
      `[Media Gateway] Cloudinary fallback error for key "${key}":`,
      fallbackError
    );
    return new Response("Failed to fetch media asset", { status: 502 });
  }
}

export async function HEAD(
  req: Request,
  { params }: { params: { path: string[] } }
) {
  const authResponse = await verifyMediaAuth(req);
  if (authResponse) {
    return new Response(null, { status: authResponse.status });
  }

  const segments = params.path;

  if (!isSafeKey(segments)) {
    return new Response(null, { status: 400 });
  }

  const key = segments.join("/");

  // 1. Try R2 HEAD
  let r2Error: unknown = null;
  try {
    const r2Bucket = await getR2Bucket();

    if (r2Bucket) {
      const head = await r2Bucket.head(key);
      if (head) {
        const contentType =
          head.httpMetadata?.contentType ?? inferContentType(key);
        const cacheControl = getCacheControl(key, contentType);

        const headers = new Headers();
        headers.set("Content-Type", contentType);
        headers.set("Cache-Control", cacheControl);
        headers.set("Accept-Ranges", "bytes");
        headers.set("X-Content-Type-Options", "nosniff");
        headers.set("Content-Length", head.size.toString());

        if (head.httpEtag) headers.set("ETag", head.httpEtag);
        if (head.uploaded) headers.set("Last-Modified", head.uploaded.toUTCString());

        const ifNoneMatch = req.headers.get("if-none-match");
        if (
          ifNoneMatch &&
          head.httpEtag &&
          (ifNoneMatch === head.httpEtag || ifNoneMatch === "*")
        ) {
          return new Response(null, { status: 304, headers });
        }

        return new Response(null, { status: 200, headers });
      }
    }
  } catch (err) {
    r2Error = err;
    console.error(`[Media Gateway HEAD] R2 head error for key "${key}":`, r2Error);
  }

  // 2. Check if Cloudinary Fallback is Enabled
  const fallbackEnabled = await isCloudinaryFallbackEnabled();
  const reason = r2Error ? "r2_error" : "not_found";

  if (!fallbackEnabled) {
    if (process.env.NODE_ENV === "development") {
      try {
        const prodRes = await fetch(`https://pyqvitap.site/api/media/${key}`);
        if (prodRes.ok && prodRes.body) {
          const headers = new Headers(prodRes.headers);
          return new Response(prodRes.body, {
            status: prodRes.status,
            headers,
          });
        }
      } catch {}
    }

    console.warn(
      JSON.stringify({
        event: "media_r2_failure",
        reason,
        fallback_enabled: false,
        key,
      })
    );

    if (r2Error) {
      return new Response(null, { status: 500 });
    }
    return new Response(null, { status: 404 });
  }

  // 3. Fallback is Enabled: Structured Fallback Log (Observability)
  console.info(
    JSON.stringify({
      event: "media_fallback",
      primary: "r2",
      fallback: "cloudinary",
      reason,
      media_type: inferMediaType(key),
      key,
    })
  );

  // 4. Cloudinary HEAD fallback
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    return new Response(null, { status: 500 });
  }

  const isRaw =
    key.endsWith(".pdf") ||
    key.startsWith("papers/pdfs/") ||
    key.startsWith("papers/unapproved/");
  const cloudinaryUrl = `https://res.cloudinary.com/${cloudName}/${isRaw ? "raw" : "image"}/upload/${key}`;

  try {
    const fetchHeaders = new Headers();
    const ifNoneMatch = req.headers.get("if-none-match");
    if (ifNoneMatch) {
      fetchHeaders.set("if-none-match", ifNoneMatch);
    }
    const ifModifiedSince = req.headers.get("if-modified-since");
    if (ifModifiedSince) {
      fetchHeaders.set("if-modified-since", ifModifiedSince);
    }

    const cldResponse = await fetch(cloudinaryUrl, { method: "HEAD", headers: fetchHeaders });

    if (cldResponse.status === 304) {
      const contentType =
        cldResponse.headers.get("content-type") ?? inferContentType(key);
      const cacheControl = getCacheControl(key, contentType);

      const headers = new Headers();
      headers.set("Content-Type", contentType);
      headers.set("Cache-Control", cacheControl);
      headers.set("Accept-Ranges", "bytes");
      headers.set("X-Content-Type-Options", "nosniff");
      const etag = cldResponse.headers.get("etag");
      if (etag) headers.set("ETag", etag);
      const lastModified = cldResponse.headers.get("last-modified");
      if (lastModified) headers.set("Last-Modified", lastModified);

      return new Response(null, { status: 304, headers });
    }

    if (!cldResponse.ok) {
      return new Response(null, { status: cldResponse.status === 404 ? 404 : 502 });
    }

    console.info(
      JSON.stringify({
        event: "media_fallback_success",
        primary: "r2",
        fallback: "cloudinary",
        key,
      })
    );

    const contentType =
      cldResponse.headers.get("content-type") ?? inferContentType(key);
    const cacheControl = getCacheControl(key, contentType);

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Cache-Control", cacheControl);
    headers.set("Accept-Ranges", "bytes");
    headers.set("X-Content-Type-Options", "nosniff");

    const contentLength = cldResponse.headers.get("content-length");
    if (contentLength) headers.set("Content-Length", contentLength);
    const etag = cldResponse.headers.get("etag");
    if (etag) headers.set("ETag", etag);
    const lastModified = cldResponse.headers.get("last-modified");
    if (lastModified) headers.set("Last-Modified", lastModified);

    return new Response(null, { status: 200, headers });
  } catch {
    return new Response(null, { status: 502 });
  }
}
