"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Download, Sparkles, X, Share, CheckCircle2 } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

export const PWA_V5_STORAGE_KEY = "pyqvitap:pwa-v5-installed";
export const PWA_SNOOZE_STORAGE_KEY = "pyqvitap:pwa-v5-snoozed";
const SNOOZE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export default function PwaUpdatePrompt() {
  const [isVisible, setIsVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    // 1. Capture install prompt on supporting browsers
    const handleInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);

    // 2. Check if running in standalone mode (installed PWA)
    const isStandalone =
      (typeof window !== "undefined" &&
        (window.matchMedia("(display-mode: standalone)").matches ||
          (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
          document.referrer.includes("android-app://"))) ||
      false;

    // 3. Check for URL indicators
    const searchParams = new URLSearchParams(window.location.search);
    const hasV5Param = searchParams.get("pwa") === "v5";
    const testMode = searchParams.get("test_pwa_update") === "true";

    // 4. Check device type
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice =
      /iphone|ipad|ipod/.test(userAgent) && !(window as unknown as { MSStream?: boolean }).MSStream;
    setIsIOS(iosDevice);

    // 5. Check local storage flags
    let isAlreadyUpdated = false;
    let isSnoozed = false;
    try {
      isAlreadyUpdated = window.localStorage.getItem(PWA_V5_STORAGE_KEY) === "true";
      const snoozedTime = window.localStorage.getItem(PWA_SNOOZE_STORAGE_KEY);
      if (snoozedTime) {
        const diff = Date.now() - parseInt(snoozedTime, 10);
        if (diff < SNOOZE_DURATION_MS) {
          isSnoozed = true;
        }
      }
    } catch {
      // Storage restricted fallback
    }

    // If student launched from the new v5 shortcut, record it and never prompt
    if (hasV5Param) {
      try {
        window.localStorage.setItem(PWA_V5_STORAGE_KEY, "true");
      } catch {}
      return () => {
        window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      };
    }

    // Trigger condition:
    // User opened the app in standalone mode WITHOUT ?pwa=v5, has not updated yet, and is not snoozed.
    // OR manual test query (?test_pwa_update=true)
    if (testMode || (isStandalone && !hasV5Param && !isAlreadyUpdated && !isSnoozed)) {
      setIsVisible(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
    };
  }, []);

  const handleUpdateClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          try {
            window.localStorage.setItem(PWA_V5_STORAGE_KEY, "true");
          } catch {}
          setIsSuccess(true);
        }
      } catch (err) {
        console.error("PWA install error:", err);
      }
    } else {
      // If native deferred prompt is not immediately available, show manual guidance
      setIsSuccess(true);
      try {
        window.localStorage.setItem(PWA_V5_STORAGE_KEY, "true");
      } catch {}
    }
  };

  const handleSnooze = () => {
    setIsVisible(false);
    try {
      window.localStorage.setItem(PWA_SNOOZE_STORAGE_KEY, Date.now().toString());
    } catch {}
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="App update available"
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm transition-all duration-300 animate-in fade-in"
    >
      <div className="relative w-full max-w-md rounded-3xl border border-[#3A3745] bg-[#e8e9ff] dark:bg-[#130E1F] p-5 sm:p-6 shadow-2xl text-gray-900 dark:text-white transition-all transform animate-in zoom-in-95 slide-in-from-bottom-5">
        {/* Close Button */}
        <button
          onClick={handleSnooze}
          aria-label="Dismiss update"
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white transition hover:bg-black/5 dark:hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </button>

        {isSuccess ? (
          <div className="text-center py-4 space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold font-jost text-gray-900 dark:text-white">
              App Updated Successfully!
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed max-w-sm mx-auto">
              You&apos;re now on the latest version of PyqVitAp with enhanced search speed and performance improvements.
            </p>
            <button
              onClick={() => setIsVisible(false)}
              className="mt-2 w-full rounded-2xl bg-gradient-to-r from-[#562EE7] to-[#7480FF] py-2.5 px-4 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 active:scale-95"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header with App Logo */}
            <div className="flex items-center gap-3.5">
              <div className="relative flex-shrink-0">
                <Image
                  src="/assets/icons/icon-192x192-v5.png"
                  alt="PyqVitAp App"
                  width={56}
                  height={56}
                  className="rounded-2xl shadow-md border border-[#3A3745]/40"
                />
                <span className="absolute -top-1.5 -right-1.5 flex h-5 px-1.5 items-center justify-center rounded-full bg-gradient-to-r from-[#562EE7] to-[#7480FF] text-[9px] font-extrabold text-white shadow">
                  NEW
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#562EE7] dark:text-[#A78BFA] uppercase tracking-wide">
                  <Sparkles className="h-3 w-3" />
                  <span>Update Available</span>
                </div>
                <h3 className="text-base sm:text-lg font-bold font-jost text-gray-900 dark:text-white leading-tight">
                  Update PyqVitAp App
                </h3>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-sans">
              We&apos;ve updated PyqVitAp with the latest improvements, faster paper loading, and enhanced search engine speed. Update your app now for the smoothest experience!
            </p>

            {/* Platform Specific Steps */}
            {isIOS ? (
              <div className="rounded-2xl bg-white/70 dark:bg-black/40 border border-[#3A3745]/30 p-3.5 space-y-2 text-xs text-gray-700 dark:text-gray-300">
                <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <Share className="h-3.5 w-3.5 text-[#562EE7] dark:text-[#A78BFA]" />
                  <span>iOS Update Steps:</span>
                </p>
                <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px] sm:text-xs">
                  <li>Tap the <strong>Share</strong> button at the bottom of Safari.</li>
                  <li>Scroll down and select <strong>&quot;Add to Home Screen&quot;</strong>.</li>
                  <li>Tap <strong>&quot;Add&quot;</strong> in the top right to complete the update.</li>
                </ol>
              </div>
            ) : null}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              {!isIOS && (
                <button
                  onClick={handleUpdateClick}
                  className="w-full sm:flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#562EE7] to-[#7480FF] py-2.5 px-4 text-xs sm:text-sm font-semibold text-white shadow-lg transition hover:opacity-95 active:scale-95"
                >
                  <Download className="h-4 w-4" />
                  <span>Update App</span>
                </button>
              )}
              <button
                onClick={handleSnooze}
                className={`w-full ${!isIOS ? "sm:w-auto" : ""} rounded-2xl border border-[#3A3745]/50 bg-white/50 dark:bg-black/30 py-2.5 px-4 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 transition hover:bg-black/5 dark:hover:bg-white/10`}
              >
                {isIOS ? "Got it" : "Remind Me Later"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
