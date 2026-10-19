"use client";

import React, { useState, useEffect, useRef } from "react";

export const ANNOUNCEMENT_STORAGE_KEY = "pyqvitap:1102-announcement:v1";
export const COUNTDOWN_INITIAL_SECONDS = 5;

export default function ReliabilityAnnouncementModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_INITIAL_SECONDS);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);

  // 1. Client-only check for prior acknowledgement
  useEffect(() => {
    try {
      const acknowledged = window.localStorage.getItem(ANNOUNCEMENT_STORAGE_KEY);
      if (!acknowledged) {
        setIsOpen(true);
      }
    } catch {
      // If localStorage is unavailable, fail-safe: display modal
      setIsOpen(true);
    }
  }, []);

  // 2. Lock background scrolling when modal is active
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // 3. Five-second countdown timer starting upon display
  useEffect(() => {
    if (!isOpen) return;

    setCountdown(COUNTDOWN_INITIAL_SECONDS);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  // 4. Focus management: focus the modal container when opened, and button when enabled
  useEffect(() => {
    if (!isOpen) return;

    if (countdown === 0 && buttonRef.current) {
      buttonRef.current.focus();
    } else if (modalContainerRef.current) {
      modalContainerRef.current.focus();
    }
  }, [isOpen, countdown]);

  // 5. Prevent Escape key dismissal and trap keyboard navigation inside modal
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (e.key === "Tab") {
      // Only the button is focusable; keep focus trapped inside the dialog
      if (countdown === 0 && buttonRef.current) {
        e.preventDefault();
        buttonRef.current.focus();
      } else {
        e.preventDefault();
        modalContainerRef.current?.focus();
      }
    }
  };

  // 6. User acknowledgement handler
  const handleAcknowledge = () => {
    if (countdown > 0) return;

    try {
      window.localStorage.setItem(ANNOUNCEMENT_STORAGE_KEY, "acknowledged");
    } catch {
      // In private browsing mode where setItem may throw, proceed cleanly
    }

    setIsOpen(false);
  };

  if (!isOpen) {
    return null;
  }

  const isButtonDisabled = countdown > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="announcement-modal-title"
      aria-describedby="announcement-modal-desc"
      tabIndex={-1}
      ref={modalContainerRef}
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 sm:p-6 outline-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-[#7480FF]/30 bg-white shadow-2xl backdrop-blur-xl dark:border-[#3A3745] dark:bg-[#130E1F] text-gray-900 dark:text-gray-100 overflow-hidden"
      >
        {/* Header with decorative badge */}
        <div className="px-5 pt-6 pb-2 sm:px-7 sm:pt-7">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#562EE7]/10 text-[#562EE7] dark:bg-[#7480FF]/15 dark:text-[#A78BFA] mb-3">
            <span>Notice</span>
          </div>
          <h2
            id="announcement-modal-title"
            className="text-lg sm:text-xl md:text-2xl font-bold font-jost leading-snug text-gray-900 dark:text-white"
          >
            A Quick Note from the PyqVitAp Team! 👋
          </h2>
        </div>

        {/* Scrollable Announcement Body */}
        <div
          id="announcement-modal-desc"
          className="flex-1 overflow-y-auto px-5 py-3 sm:px-7 sm:py-4 space-y-4 text-xs sm:text-sm leading-relaxed text-gray-700 dark:text-gray-200"
        >
          <p className="font-semibold text-gray-900 dark:text-gray-100">
            Hey everyone!
          </p>

          <p>
            Occasionally, you may encounter a Cloudflare Error 1102 while
            browsing PyqVitAp or opening question papers.
          </p>

          <p>
            We&apos;re aware of this issue and are doing our best to improve the
            website&apos;s reliability.
          </p>

          {/* Refresh Guidance Callout */}
          <div className="rounded-xl border border-amber-300/80 bg-amber-50/80 p-3.5 sm:p-4 text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-200">
            <p className="font-medium text-xs sm:text-sm">
              🔄 If you encounter this error, please try refreshing the page 2–3
              times. This may help restore access.
            </p>
          </div>

          <p>
            PyqVitAp is an open-source student project, built and maintained by
            student developers to help our fellow students access previous-year
            question papers. We&apos;re doing our best to keep this platform
            available to everyone free of cost.
          </p>

          <p>Thank you for your patience, understanding, and continued support! ❤️</p>

          <p className="font-semibold text-gray-900 dark:text-white pt-1">
            — Team PyqVitAp
          </p>
        </div>

        {/* Footer with Mandatory 5-Second Countdown Button */}
        <div className="border-t border-gray-100 dark:border-[#221B33] bg-gray-50/70 dark:bg-[#0E0A17]/80 px-5 py-4 sm:px-7 sm:py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 text-center sm:text-left">
            {isButtonDisabled
              ? `Please review before continuing (${countdown}s remaining)`
              : "Acknowledgement unlocked"}
          </span>

          <button
            ref={buttonRef}
            type="button"
            disabled={isButtonDisabled}
            onClick={handleAcknowledge}
            aria-disabled={isButtonDisabled}
            className={`w-full sm:w-auto min-w-[130px] rounded-xl px-5 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#562EE7] focus:ring-offset-2 dark:focus:ring-offset-[#130E1F] ${
              isButtonDisabled
                ? "cursor-not-allowed bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-500 select-none shadow-none"
                : "cursor-pointer bg-gradient-to-r from-[#562EE7] to-[#7480FF] text-white shadow-lg shadow-[#562EE7]/25 hover:from-[#4722d4] hover:to-[#6370fa] active:scale-[0.98]"
            }`}
          >
            {isButtonDisabled ? `Got it (${countdown})` : "Got it"}
          </button>
        </div>
      </div>
    </div>
  );
}
