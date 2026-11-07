"use client";

import React, { useState, useEffect } from "react";
import { Wrench, X } from "lucide-react";

export const MAINTENANCE_NOTICE_STORAGE_KEY = "pyqvitap:maintenance-notice-dismissed:v1";

export default function MaintenanceToast() {
  const [isVisible, setIsVisible] = useState(false);

  // 1. Client-only check for prior dismissal in the current browser session
  useEffect(() => {
    try {
      const isDismissed = window.sessionStorage.getItem(MAINTENANCE_NOTICE_STORAGE_KEY);
      if (!isDismissed) {
        setIsVisible(true);
      }
    } catch {
      // In restricted browsing environments where sessionStorage is blocked, default to visible
      setIsVisible(true);
    }
  }, []);

  // 2. Dismissal handler - stores state in sessionStorage so notice stays dismissed for this session
  const handleDismiss = () => {
    setIsVisible(false);
    try {
      window.sessionStorage.setItem(MAINTENANCE_NOTICE_STORAGE_KEY, "true");
    } catch {
      // Fail-safe if storage is restricted
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <aside
      aria-label="Maintenance notice"
      role="status"
      className="fixed top-4 right-4 sm:top-5 sm:right-6 z-[90] w-[calc(100vw-2rem)] max-w-sm sm:max-w-md pointer-events-auto transition-all duration-300 ease-out animate-in fade-in slide-in-from-top-3"
    >
      <div className="relative flex items-start gap-3 rounded-xl sm:rounded-2xl border border-zinc-200/90 bg-white/95 p-4 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.12),0_4px_6px_-2px_rgba(0,0,0,0.05)] backdrop-blur-md dark:border-[#3A3745] dark:bg-[#130E1F]/95 dark:text-zinc-100 dark:shadow-[0_20px_35px_-5px_rgba(0,0,0,0.6),0_0_20px_-5px_rgba(124,58,237,0.15)]">
        {/* Maintenance / Tools Icon Badge */}
        <div className="flex-shrink-0 mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-[#562EE7]/10 text-[#562EE7] dark:bg-[#7480FF]/15 dark:text-[#A78BFA]">
          <Wrench className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
        </div>

        {/* Content Area */}
        <div className="flex-1 pr-6 min-w-0">
          <h3 className="text-sm sm:text-base font-bold font-jost text-gray-900 dark:text-white leading-tight">
            We&apos;re Improving PyqVitAp
          </h3>

          <div className="mt-2 space-y-2 text-xs sm:text-[13px] text-gray-600 dark:text-gray-300 leading-relaxed font-sans">
            <p>
              We&apos;re currently working on improvements to make PyqVitAp faster, more reliable, and better for everyone.
            </p>
            <p>
              During this period, you may occasionally experience errors, slower loading, or other unexpected issues. We&apos;re working hard to resolve these problems and restore the smooth experience you expect, with our target being November 2, 2026.
            </p>
            <p>
              Thank you for your patience and understanding as we improve PyqVitAp for the student community.
            </p>
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss maintenance notice"
          className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[#562EE7]"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
