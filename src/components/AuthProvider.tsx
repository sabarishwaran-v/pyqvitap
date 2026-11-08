import React from "react";
import { headers } from "next/headers";
import { ClerkProvider } from "@clerk/nextjs";
import { pyqvitapClerkAppearance } from "@/config/clerk-theme";
import { AuthModeProvider } from "@/context/AuthModeContext";

const PROD_CLERK_KEY = "pk_live_Y2xlcmsucHlxdml0YXAuc2l0ZSQ";
const LOCAL_DEV_CLERK_KEY = "pk_test_d2FybS13YWxydXMtNDc4NS5jbGVyay5hY2NvdW50cy5kZXYk";

interface AuthProviderProps {
  authEnabled?: boolean;
  children: React.ReactNode;
}

/**
 * High-Performance Auth Provider Wrapper
 *
 * When authEnabled=false (Open Access Mode):
 * - Bypasses ClerkProvider completely.
 * - Does NOT inject Clerk browser scripts or fire network subrequests.
 * - Guarantees maximum page load speed and zero latency overhead.
 * - Wraps children in lightweight AuthModeProvider so components know auth is disabled.
 *
 * When authEnabled=true (Restricted Mode):
 * - Initializes Clerk with custom appearance and @vitapstudent.ac.in domain gates.
 */
export function AuthProvider({ authEnabled = false, children }: AuthProviderProps) {
  if (!authEnabled) {
    return <AuthModeProvider authEnabled={false}>{children}</AuthModeProvider>;
  }

  // Detect localhost on both server (via headers) and client to ensure matching dev keys
  let isLocal = false;
  try {
    const headersList = headers();
    const host = headersList.get("host") || "";
    const mfUrl = headersList.get("mf-original-url") || "";
    const xHost = headersList.get("x-forwarded-host") || "";
    if (
      host.includes("localhost") ||
      host.includes("127.0.0.1") ||
      mfUrl.includes("localhost") ||
      mfUrl.includes("127.0.0.1") ||
      xHost.includes("localhost") ||
      xHost.includes("127.0.0.1")
    ) {
      isLocal = true;
    }
  } catch {
    if (typeof window !== "undefined") {
      const h = window.location.hostname;
      if (h === "localhost" || h === "127.0.0.1") {
        isLocal = true;
      }
    }
  }

  const defaultKey = isLocal ? LOCAL_DEV_CLERK_KEY : PROD_CLERK_KEY;
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || defaultKey;

  if (!publishableKey) {
    return <AuthModeProvider authEnabled={false}>{children}</AuthModeProvider>;
  }

  const effectiveKey = isLocal ? LOCAL_DEV_CLERK_KEY : publishableKey;

  return (
    <ClerkProvider
      publishableKey={effectiveKey}
      appearance={pyqvitapClerkAppearance}
      localization={{
        unstable__errors: {
          form_identifier_not_found: "Couldn't find your account, Please sign-up by continuing.",
        },
      }}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
    >
      <AuthModeProvider authEnabled={true}>{children}</AuthModeProvider>
    </ClerkProvider>
  );
}
