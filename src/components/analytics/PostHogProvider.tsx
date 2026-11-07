"use client";

import { useEffect, Suspense } from "react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import PostHogPageView from "./PostHogPageView";
import { initGlobalErrorTelemetry } from "@/lib/telemetry";

const POSTHOG_KEY =
  process.env.NEXT_PUBLIC_POSTHOG_KEY ||
  "phc_xuizP7wS5d8kYLAp9sPC5EU3uGt5aFxucvwMB53mUTae";
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

if (typeof window !== "undefined") {
  if (POSTHOG_KEY && !posthog.__loaded) {
    try {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        person_profiles: "identified_only",
        capture_pageview: false, // Explicitly and accurately handled via PostHogPageView on Next.js App Router route transitions
        capture_pageleave: true,
        autocapture: true, // Enables click maps, tab switches, and user interaction funnels
        disable_session_recording: false,
        session_recording: {
          maskAllInputs: true, // Hides passwords, verification codes, and form inputs for student privacy
        },
        capture_exceptions: true, // Native PostHog error tracking and stack trace grouping
        feature_flag_request_timeout_ms: 3000,
        loaded: (ph) => {
          if (process.env.NODE_ENV === "development") {
            ph.debug(false);
          }
        },
      });
    } catch {
      // Fail-open: initialization failures must never crash the application
    }
  }
}

interface PostHogProviderWrapperProps {
  children: React.ReactNode;
}

export default function PostHogProviderWrapper({
  children,
}: PostHogProviderWrapperProps) {
  useEffect(() => {
    // Initialize global client error and unhandled rejection listeners
    initGlobalErrorTelemetry();
  }, []);

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  );
}
