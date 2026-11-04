import { getCloudflareContext } from "@opennextjs/cloudflare";

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
    // Throws outside of active Cloudflare Worker request context
  }

  return undefined;
}

/**
 * Dynamically evaluates whether Maintenance Mode is active.
 *
 * Evaluation Hierarchy (Approach B - Dashboard Toggle):
 * 1. Cloudflare Flagship flag: `MAINTENANCE_MODE`
 * 2. Cloudflare Dashboard Environment Variable: `env.MAINTENANCE_MODE`
 * 3. Local environment variable: `process.env.MAINTENANCE_MODE` or `process.env.NEXT_PUBLIC_MAINTENANCE_MODE`
 * 4. Default: `false` (normal operations)
 */
export async function isMaintenanceMode(): Promise<boolean> {
  // 1. In Cloudflare Workers runtime, check Flagship first if present
  try {
    const env = getRuntimeCloudflareEnv();
    if (env) {
      // Check Cloudflare Flagship binding
      const flags = env.FLAGS as FlagshipBinding | undefined;
      if (flags && typeof flags.getBooleanValue === "function") {
        try {
          const val = await flags.getBooleanValue("MAINTENANCE_MODE", false);
          if (val === true) {
            return true;
          }
        } catch (flagErr) {
          console.warn("[Maintenance] Flagship evaluation failed:", flagErr);
        }
      }

      // Check Cloudflare Environment Variables / Secrets (set via Cloudflare Dashboard)
      const cfMaintenance = env.MAINTENANCE_MODE ?? env.NEXT_PUBLIC_MAINTENANCE_MODE;
      if (cfMaintenance === "true" || cfMaintenance === true || cfMaintenance === "1") {
        return true;
      }
      if (cfMaintenance === "false" || cfMaintenance === false || cfMaintenance === "0") {
        return false;
      }
    }
  } catch {
    // Cloudflare runtime context unavailable
  }

  // 2. Fallback to process.env (Node.js runtime, build time, local testing)
  if (typeof process !== "undefined" && process.env) {
    const procMaintenance = process.env.MAINTENANCE_MODE ?? process.env.NEXT_PUBLIC_MAINTENANCE_MODE;
    if (procMaintenance === "true" || procMaintenance === "1") {
      return true;
    }
    if (procMaintenance === "false" || procMaintenance === "0") {
      return false;
    }
  }

  // 3. Fail-safe default: normal operations
  return false;
}

/**
 * Global Maintenance Mode Configuration for PyqVitAp.
 * Backward-compatible synchronous export for components.
 * In development or local environments, respects local env variables.
 */
export const MAINTENANCE_MODE =
  typeof process !== "undefined" &&
  (process.env.MAINTENANCE_MODE === "true" || process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true");
