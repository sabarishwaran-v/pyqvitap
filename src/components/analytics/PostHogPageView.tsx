"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import posthog from "posthog-js";

export default function PostHogPageView(): null {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastCapturedRef = useRef<string>("");

  useEffect(() => {
    try {
      if (!pathname) return;
      if (typeof window === "undefined") return;

      const currentPath = pathname;
      const search = searchParams?.toString();
      const fullUrl = search ? `${currentPath}?${search}` : currentPath;

      // Avoid immediate duplicate emits for the exact same URL state
      if (lastCapturedRef.current === fullUrl) return;
      lastCapturedRef.current = fullUrl;

      posthog.capture("$pageview", {
        $current_url: window.location.href,
        path: currentPath,
        search_params: search || undefined,
        referrer: document.referrer || undefined,
        title: document.title || undefined,
      });
    } catch {
      // Fail-open: page tracking errors must never crash navigation
    }
  }, [pathname, searchParams]);

  return null;
}
