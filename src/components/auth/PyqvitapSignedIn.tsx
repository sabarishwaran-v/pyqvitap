"use client";

import React, { useEffect, useState } from "react";
import { SignedIn as ClerkSignedIn, UserButton } from "@clerk/nextjs";
import { getPyqvitapUserProfileAppearance } from "@/config/clerk-theme";

/**
 * PyqvitapSignedIn:
 * In production (pyqvitap.site):
 *   Strictly delegates to Clerk's <SignedIn> so only verified students/faculty see protected controls.
 * In local development / testing (localhost / 127.0.0.1):
 *   Renders children immediately so that developers and testers can verify all options
 *   (Pin Subjects, Request Paper, Upload Papers, PDF toolbar, Report, etc.) without requiring
 *   a live production Clerk session.
 */
export function PyqvitapSignedIn({ children }: { children: React.ReactNode }) {
  const [isLocalhost, setIsLocalhost] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const h = window.location.hostname;
      return h === "localhost" || h === "127.0.0.1";
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const h = window.location.hostname;
      setIsLocalhost(h === "localhost" || h === "127.0.0.1");
    }
  }, []);

  if (isLocalhost) {
    return <>{children}</>;
  }

  return <ClerkSignedIn>{children}</ClerkSignedIn>;
}

export function PyqvitapUserAvatar({ isDark }: { isDark: boolean }) {
  const [isLocalhost, setIsLocalhost] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const h = window.location.hostname;
      return h === "localhost" || h === "127.0.0.1";
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const h = window.location.hostname;
      setIsLocalhost(h === "localhost" || h === "127.0.0.1");
    }
  }, []);

  if (isLocalhost) {
    return (
      <div
        className="flex h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 items-center justify-center rounded-full border border-[#3A3745] bg-[#562EE7] text-xs font-bold text-white shadow-md select-none"
        title="Testing Mode (Localhost)"
      >
        VIT
      </div>
    );
  }

  return (
    <UserButton
      afterSignOutUrl="/"
      userProfileProps={{
        appearance: getPyqvitapUserProfileAppearance(isDark),
      }}
    />
  );
}
