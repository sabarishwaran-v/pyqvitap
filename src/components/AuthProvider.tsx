import React from "react";
import { headers } from "next/headers";
import { ClerkProvider } from "@clerk/nextjs";
import { pyqvitapClerkAppearance } from "@/config/clerk-theme";

const LOCAL_DEV_CLERK_KEY = "pk_test_d2FybS13YWxydXMtNDc4NS5jbGVyay5hY2NvdW50cy5kZXYk";

/**
 * Fail-Safe Clerk Auth Provider Wrapper
 *
 * If NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not configured (e.g. during initial setup
 * or when AUTH_ENABLED=false), renders children cleanly without crashing the application.
 * When present, initializes Clerk with the PyqVitAp custom dark purple appearance.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    return <>{children}</>;
  }

  // Detect localhost on both server (via headers) and client to ensure matching dev keys
  let effectiveKey = publishableKey;
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
      effectiveKey = LOCAL_DEV_CLERK_KEY;
    }
  } catch {
    if (typeof window !== "undefined") {
      const h = window.location.hostname;
      if (h === "localhost" || h === "127.0.0.1") {
        effectiveKey = LOCAL_DEV_CLERK_KEY;
      }
    }
  }

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
      {children}
    </ClerkProvider>
  );
}
