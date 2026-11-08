"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import posthog from "posthog-js";
import { useAuthMode } from "@/context/AuthModeContext";

/**
 * Synchronizes authenticated Clerk user profiles with PostHog when auth is enabled.
 * When auth is disabled (Open Access Mode), safely returns null without mounting
 * Clerk's useUser hook, preventing any runtime errors or script loading.
 */
export default function PostHogUserSync(): React.ReactNode {
  const { authEnabled } = useAuthMode();

  if (!authEnabled) {
    return null;
  }

  return <PostHogUserSyncInner />;
}

function PostHogUserSyncInner(): null {
  const { user, isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (!isLoaded || typeof window === "undefined") return;

    try {
      if (isSignedIn && user) {
        const email = user.primaryEmailAddress?.emailAddress;
        const role = email?.endsWith("@vitapstudent.ac.in")
          ? "student"
          : "user";

        posthog.identify(user.id, {
          email,
          name: user.fullName || user.firstName || "VIT-APian",
          role,
          campus: "VIT-AP",
          created_at: user.createdAt ? new Date(user.createdAt).toISOString() : undefined,
        });
      } else if (!isSignedIn) {
        // Reset distinct ID when user logs out so subsequent visitor sessions aren't mixed
        if (posthog.get_distinct_id?.()) {
          posthog.reset();
        }
      }
    } catch {
      // Fail-open: telemetry errors must never impact UI execution
    }
  }, [user, isLoaded, isSignedIn]);

  return null;
}
