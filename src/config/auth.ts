import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Cloudflare Flagship & Clerk Authentication Configuration for PyqVitAp
 *
 * Feature Flag Kill Switch:
 * - Flag Name: AUTH_ENABLED
 * - Default State: false (Authentication completely bypassed)
 * - Fail-Safe State: false (Under no circumstances does auth lock users out on error)
 */

export const ALLOWED_EMAIL_DOMAINS = [
  "vitapstudent.ac.in",
] as const;

// Backward-compatible alias for single-domain consumers
export const ALLOWED_EMAIL_DOMAIN = ALLOWED_EMAIL_DOMAINS[0];

/**
 * Strict, case-insensitive verification that the email domain belongs exactly
 * to the authorized student domain:
 * 1. vitapstudent.ac.in (students)
 *
 * Prevents subdomain hijacking, suffix spoofing, lookalike attacks, and non-student access.
 *
 * Allowed:   student@vitapstudent.ac.in
 * Denied:    faculty@vitap.ac.in
 * Denied:    student@gmail.com
 * Denied:    student@vitapstudent.ac.in.evil.com
 * Denied:    student@evilvitap.ac.in
 */
export function isAuthorizedEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== "string") {
    return false;
  }

  const clean = email.trim().toLowerCase();
  const atIndex = clean.lastIndexOf("@");
  if (atIndex <= 0 || atIndex === clean.length - 1) {
    return false;
  }

  // Ensure there is exactly one '@' symbol
  if (clean.indexOf("@") !== atIndex) {
    return false;
  }

  const domain = clean.slice(atIndex + 1);
  return (ALLOWED_EMAIL_DOMAINS as readonly string[]).includes(domain);
}

/**
 * Validates university email format and domain in real-time as user types.
 * Returns an error message string if invalid, or null if valid.
 */
export function getEmailValidationError(email: string): string | null {
  if (!email || !email.trim()) {
    return null; // Empty field has no error yet (until interaction/submission)
  }

  const clean = email.trim();
  const atIndex = clean.lastIndexOf("@");

  if (atIndex === -1) {
    return "Student email required (@vitapstudent.ac.in)";
  }

  if (atIndex === 0) {
    return "Please enter your username before the @";
  }

  if (atIndex === clean.length - 1) {
    return "Please complete the student domain (@vitapstudent.ac.in)";
  }

  if (clean.indexOf("@") !== atIndex) {
    return "Invalid email address format";
  }

  const domain = clean.slice(atIndex + 1).toLowerCase();
  const isMatch = (ALLOWED_EMAIL_DOMAINS as readonly string[]).includes(domain);

  if (!isMatch) {
    return "Student email required. Use your @vitapstudent.ac.in account.";
  }

  return null;
}

/**
 * Evaluates the Cloudflare Flagship boolean flag `AUTH_ENABLED`.
 *
 * Evaluation Order:
 * 1. Cloudflare Workers Flagship binding (`env.FLAGS`) if present in runtime context.
 * 2. Local environment variable `AUTH_ENABLED` (e.g. for development testing).
 * 3. Fail-safe default: `false`.
 */
interface FlagshipBinding {
  getBooleanValue(name: string, defaultValue?: boolean, context?: Record<string, unknown>): Promise<boolean>;
  get?(name: string, defaultValue?: unknown, context?: Record<string, unknown>): Promise<unknown>;
}

/**
 * Retrieves the Cloudflare Worker environment object from the active request context.
 * In Cloudflare Workers (production), OpenNext populates the context synchronously via
 * globalThis[Symbol.for("__cloudflare-context__")] in init.js for every incoming request.
 */
function getRuntimeCloudflareEnv(): Record<string, unknown> | undefined {
  // 1. Direct global Symbol check (fastest and most direct in Cloudflare Workers)
  try {
    const globalContext = (globalThis as Record<string | symbol, unknown>)[
      Symbol.for("__cloudflare-context__")
    ] as { env?: Record<string, unknown> } | undefined;
    if (globalContext?.env && typeof globalContext.env === "object") {
      return globalContext.env;
    }
  } catch {
    // Ignore and proceed
  }

  // 2. OpenNext official sync helper
  try {
    const ctx = getCloudflareContext();
    if (ctx?.env && typeof ctx.env === "object") {
      return ctx.env as unknown as Record<string, unknown>;
    }
  } catch {
    // Throws outside of active Cloudflare Worker request context (e.g. local dev / test)
  }

  return undefined;
}

export async function isAuthEnabled(req?: Request | string): Promise<boolean> {
  // Localhost preview & testing bypass:
  // When testing locally on localhost or 127.0.0.1, bypass authentication so that
  // all features (PDF preview, thumbnails, requests, uploads, tags) can be tested freely without production Clerk domain restriction.
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host.includes("localhost") || host.includes("127.0.0.1")) {
      return false;
    }
  }

  if (req) {
    const host = typeof req === "string" ? req : req.headers?.get("host") || "";
    const mfUrl = typeof req === "string" ? "" : req.headers?.get("mf-original-url") || "";
    const xHost = typeof req === "string" ? "" : req.headers?.get("x-forwarded-host") || "";
    if (
      host.includes("localhost") ||
      host.includes("127.0.0.1") ||
      mfUrl.includes("localhost") ||
      mfUrl.includes("127.0.0.1") ||
      xHost.includes("localhost") ||
      xHost.includes("127.0.0.1")
    ) {
      return false;
    }
  } else {
    try {
      const { headers } = await import("next/headers");
      const h = headers();
      const host = h.get("host") || "";
      const mfUrl = h.get("mf-original-url") || "";
      const xHost = h.get("x-forwarded-host") || "";
      if (
        host.includes("localhost") ||
        host.includes("127.0.0.1") ||
        mfUrl.includes("localhost") ||
        mfUrl.includes("127.0.0.1") ||
        xHost.includes("localhost") ||
        xHost.includes("127.0.0.1")
      ) {
        return false;
      }
    } catch {
      // Outside active Next.js request context (e.g. unit tests or build time)
    }
  }

  // 1. In Cloudflare Workers runtime, evaluate the Flagship Binding first.
  // Flagship is the authoritative gatekeeper in deployed environments.
  // Stale build-time or process.env variables must NEVER override a valid Flagship binding.
  try {
    const env = getRuntimeCloudflareEnv();
    const flags = env?.FLAGS as FlagshipBinding | undefined;
    if (flags && typeof flags.getBooleanValue === "function") {
      try {
        const val = await flags.getBooleanValue("AUTH_ENABLED", false);
        return Boolean(val);
      } catch (flagError) {
        // If the Flagship service call fails in production, fail safe to false
        console.error("[Auth] Flagship evaluation failed, failing safe to false:", flagError);
        return false;
      }
    }

    // Check Cloudflare Worker environment variables (e.g. wrangler.jsonc vars)
    if (env) {
      const cfAuth = env.AUTH_ENABLED ?? env.NEXT_PUBLIC_AUTH_ENABLED;
      if (cfAuth === "true" || cfAuth === true || cfAuth === "1") return true;
      if (cfAuth === "false" || cfAuth === false || cfAuth === "0") return false;
    }
  } catch {
    // Cloudflare runtime context unavailable; proceed to local environment fallback
  }

  // 2. Local development and test environments fallback:
  // When no Flagship binding is bound to the runtime, respect explicit local process.env.AUTH_ENABLED
  if (typeof process !== "undefined" && process.env) {
    if (process.env.AUTH_ENABLED === "true") {
      return true;
    }
    if (process.env.AUTH_ENABLED === "false") {
      return false;
    }
  }

  // 3. Strict fail-safe default: authentication is disabled
  return false;
}

/**
 * Identifies routes that remain completely publicly accessible without session evaluation.
 * Note: When AUTH_ENABLED=true, "/" evaluates the session so that:
 * - Signed-out visitors see the LoginLanding page at "/"
 * - Authenticated authorized visitors see the homepage
 * - Authenticated unauthorized visitors are denied access and redirected to /unauthorized
 */
export function isPublicPath(pathname: string): boolean {
  if (
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname === "/unauthorized" ||
    pathname.startsWith("/disclaimer") ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/unsubscribe") ||
    pathname.startsWith("/api/unsubscribe") ||
    pathname.startsWith("/api/subscribe") ||
    pathname === "/api/health" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico"
  ) {
    return true;
  }
  return false;
}

/**
 * Identifies routes meant strictly for authentication flow (/sign-in, /sign-up, /unauthorized).
 */
export function isAuthFlowPath(pathname: string): boolean {
  return (
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname === "/unauthorized"
  );
}

/**
 * Identifies protected routes requiring authentication when AUTH_ENABLED=true.
 */
export function isProtectedPath(pathname: string): boolean {
  if (isPublicPath(pathname)) {
    return false;
  }

  // Application pages and protected API endpoints
  if (
    pathname.startsWith("/catalogue") ||
    pathname.startsWith("/paper/") ||
    pathname.startsWith("/upload") ||
    pathname.startsWith("/pinned") ||
    pathname.startsWith("/request") ||
    pathname.startsWith("/api/media/") ||
    pathname.startsWith("/api/papers") ||
    pathname.startsWith("/api/upload") ||
    pathname.startsWith("/api/request") ||
    pathname.startsWith("/api/user-papers") ||
    pathname.startsWith("/api/selected-papers")
  ) {
    return true;
  }

  return false;
}

/**
 * Validates and sanitizes redirect destinations to prevent open-redirect vulnerabilities.
 * Ensures the target is either a relative path starting with '/' (e.g. '/paper/123')
 * or an absolute URL matching the same trusted application origin.
 */
export function sanitizeRedirectUrl(url: string | null | undefined, baseUrl?: string): string {
  if (!url || typeof url !== "string") {
    return "/";
  }

  const trimmed = url.trim();

  // 1. Relative paths starting with a single '/' (and not protocol-relative '//')
  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.startsWith("/\\")) {
    return trimmed;
  }

  // 2. Absolute URL validation matching current origin
  try {
    const parsed = new URL(trimmed);
    if (baseUrl) {
      const baseOrigin = new URL(baseUrl).origin;
      if (parsed.origin === baseOrigin) {
        return parsed.pathname + parsed.search + parsed.hash;
      }
    }
    // Check against standard PyqVitAp hostnames
    const allowedHosts = ["pyqvitap.site", "www.pyqvitap.site", "localhost"];
    if (
      allowedHosts.includes(parsed.hostname) ||
      parsed.hostname.endsWith(".pyqvitap.site")
    ) {
      return parsed.pathname + parsed.search + parsed.hash;
    }
  } catch {
    // Malformed URL, fall back to root
  }

  return "/";
}
