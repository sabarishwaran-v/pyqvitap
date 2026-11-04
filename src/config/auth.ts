import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Cloudflare Flagship & Clerk Authentication Configuration for PyqVitAp
 *
 * Feature Flag Kill Switch:
 * - Flag Name: AUTH_ENABLED
 * - Default State: false (Authentication completely bypassed)
 * - Fail-Safe State: false (Under no circumstances does auth lock users out on error)
 */

export const ALLOWED_EMAIL_DOMAIN = "vitapstudent.ac.in";

/**
 * Strict, case-insensitive verification that the email belongs exactly to @vitapstudent.ac.in.
 * Prevents subdomain hijacking, suffix spoofing, and lookalike attacks.
 *
 * Allowed:   student@vitapstudent.ac.in
 * Denied:    student@vitap.ac.in
 * Denied:    student@gmail.com
 * Denied:    student@vitapstudent.ac.in.evil.com
 * Denied:    student@evilvitapstudent.ac.in
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
  return domain === ALLOWED_EMAIL_DOMAIN;
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
}

export async function isAuthEnabled(): Promise<boolean> {
  // 1. Try Cloudflare Workers Flagship Binding
  try {
    let ctx: ReturnType<typeof getCloudflareContext> | undefined;
    try {
      ctx = getCloudflareContext();
    } catch {
      if (!process.env.NEXT_RUNTIME && typeof window === "undefined") {
        process.env.NEXT_RUNTIME = "nodejs";
      }
      ctx = await getCloudflareContext({ async: true });
    }
    const env = ctx?.env as { FLAGS?: FlagshipBinding } | undefined;
    const flags = env?.FLAGS;
    if (flags && typeof flags.getBooleanValue === "function") {
      const val = await flags.getBooleanValue("AUTH_ENABLED", false);
      return Boolean(val);
    }
  } catch {
    // Flagship context not bound, or threw during evaluation
  }

  // 2. Fallback to environment variable (Local development or explicit runtime setting)
  if (typeof process !== "undefined" && process.env) {
    if (process.env.AUTH_ENABLED === "true") {
      return true;
    }
  }

  // 3. Strict fail-safe default: authentication is disabled
  return false;
}

/**
 * Identifies routes that remain publicly accessible when AUTH_ENABLED=true.
 */
export function isPublicPath(pathname: string): boolean {
  if (
    pathname === "/" ||
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname === "/unauthorized" ||
    pathname.startsWith("/disclaimer") ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/privacy") ||
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
