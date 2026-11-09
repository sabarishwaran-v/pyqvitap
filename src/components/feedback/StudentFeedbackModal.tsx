"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  usePostHog,
  useFeatureFlagPayload,
  useFeatureFlagEnabled,
} from "posthog-js/react";
import dynamic from "next/dynamic";
import { Star, ArrowUpRight, Code2, Coffee, Heart, X } from "lucide-react";
import { trackEvent } from "@/lib/telemetry";
import {
  DEFAULT_COOLDOWN_DAYS,
  DEFAULT_GITHUB_REPO,
  DEFAULT_MIN_DURATION_SECONDS,
  DEFAULT_MIN_PAPERS,
  DEFAULT_UPI_ID,
  DEFAULT_UPI_NAME,
  DEFAULT_VERSION,
  generateUpiUrl,
  isEligibleForFeedback,
  recordFeedbackCompletion,
  recordFeedbackDismissal,
  registerDownloadInterceptor,
} from "@/lib/feedback";
import type { FeedbackCampaignPayload } from "@/lib/feedback/types";

// Dynamically import QR Code canvas to ensure client-only rendering
const UpiQrCode = dynamic(() => import("./UpiQrCode"), { ssr: false });

const COMMON_ISSUES = [
  "Missing Exam Papers",
  "Search Not Accurate",
  "Slow Loading",
  "Download Problem",
  "Mobile UI Confusing",
  "Other",
];

const AMOUNT_PRESETS = [50, 99];

export default function StudentFeedbackModal() {
  const posthog = usePostHog();
  const flagPayload = useFeatureFlagPayload("student-feedback-campaign");
  const flagEnabled = useFeatureFlagEnabled("student-feedback-campaign");
  const [flagTick, setFlagTick] = useState(0);

  // Re-evaluate on PostHog feature flag load events
  useEffect(() => {
    if (!posthog) return;
    return posthog.onFeatureFlags(() => {
      setFlagTick((prev) => prev + 1);
    });
  }, [posthog]);

  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"rating" | "feedback_1to3" | "support_4to5" | "thankyou">("rating");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [amount, setAmount] = useState(50);
  const [customAmount, setCustomAmount] = useState("");
  const [showCoffeePayment, setShowCoffeePayment] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(true);
  const [forceDesktopQr, setForceDesktopQr] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Holds pending download to execute immediately after student rates or dismisses
  const pendingDownloadRef = useRef<(() => void | Promise<void>) | null>(null);

  const executePendingDownload = useCallback(() => {
    if (pendingDownloadRef.current) {
      const fn = pendingDownloadRef.current;
      pendingDownloadRef.current = null;
      try {
        void fn();
      } catch (err) {
        console.error("Failed to execute pending download:", err);
      }
    }
  }, []);

  // Extract flag payload from PostHog or env fallback
  const campaignConfig = useMemo<FeedbackCampaignPayload>(() => {
    let payloadFromFlag: FeedbackCampaignPayload | null = null;

    const rawPayload = flagPayload ?? (posthog ? posthog.getFeatureFlagPayload("student-feedback-campaign") : null);
    if (rawPayload) {
      if (typeof rawPayload === "string") {
        try {
          payloadFromFlag = JSON.parse(rawPayload);
        } catch {
          // malformed json, fallback to defaults
        }
      } else if (typeof rawPayload === "object") {
        payloadFromFlag = rawPayload as FeedbackCampaignPayload;
      }
    }

    const isFlagOn = flagEnabled !== undefined
      ? Boolean(flagEnabled)
      : (posthog ? Boolean(posthog.isFeatureEnabled("student-feedback-campaign")) : false);

    const envEnabled = process.env.NEXT_PUBLIC_FEEDBACK_CAMPAIGN_ENABLED === "true";
    const isDev = process.env.NODE_ENV === "development";

    let isEnabled = false;
    if (payloadFromFlag?.enabled !== undefined) {
      isEnabled = payloadFromFlag.enabled;
    } else if (isFlagOn) {
      isEnabled = true;
    } else if (envEnabled) {
      isEnabled = true;
    } else if (isDev && process.env.NEXT_PUBLIC_FEEDBACK_CAMPAIGN_ENABLED !== "false") {
      isEnabled = true;
    }

    return {
      enabled: isEnabled,
      version: payloadFromFlag?.version ?? Number(process.env.NEXT_PUBLIC_FEEDBACK_CAMPAIGN_VERSION || DEFAULT_VERSION),
      min_papers: payloadFromFlag?.min_papers ?? DEFAULT_MIN_PAPERS,
      min_duration_seconds: payloadFromFlag?.min_duration_seconds ?? DEFAULT_MIN_DURATION_SECONDS,
      cooldown_days: payloadFromFlag?.cooldown_days ?? DEFAULT_COOLDOWN_DAYS,
      upi_id: payloadFromFlag?.upi_id || process.env.NEXT_PUBLIC_UPI_ID || DEFAULT_UPI_ID,
      upi_name: payloadFromFlag?.upi_name || process.env.NEXT_PUBLIC_UPI_NAME || DEFAULT_UPI_NAME,
      github_repo: payloadFromFlag?.github_repo || DEFAULT_GITHUB_REPO,
    };
  }, [posthog, flagPayload, flagEnabled, flagTick]);

  // Register global download interceptor
  useEffect(() => {
    registerDownloadInterceptor((onProceed) => {
      if (!campaignConfig.enabled) {
        return false;
      }
      if (!isEligibleForFeedback(campaignConfig, { isDownloadAction: true })) {
        return false;
      }

      pendingDownloadRef.current = onProceed;
      setIsOpen(true);
      trackEvent("student_feedback_shown", {
        version: campaignConfig.version,
        trigger: "download_action",
      });
      return true;
    });

    return () => {
      registerDownloadInterceptor(null);
    };
  }, [campaignConfig]);

  // Detect mobile device & attach developer testing helpers
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 640;
    setIsMobileDevice(isMobile);

    // Testing helpers for local review
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__pyqResetFeedback = () => {
      localStorage.removeItem("pyq_feedback_completed_v");
      localStorage.removeItem("pyq_feedback_dismissed_at");
      localStorage.removeItem("pyq_feedback_dismissed_v");
      localStorage.removeItem("pyq_feedback_papers_count");
      localStorage.removeItem("pyq_feedback_first_seen");
      setIsOpen(false);
      setStep("rating");
      setRating(0);
      setHoverRating(0);
      setShowCoffeePayment(false);
      console.log("🧹 [PyqVitAp] Feedback storage reset! You can test fresh.");
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__pyqTriggerFeedback = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__pyqResetFeedback();
      localStorage.setItem("pyq_feedback_papers_count", "2");
      setIsOpen(true);
      console.log("🚀 [PyqVitAp] Feedback trigger opened with 2 papers simulated!");
    };
  }, []);

  // Trigger evaluation for passive background browsing (whichever triggers first)
  const checkEligibility = useCallback(() => {
    if (!campaignConfig.enabled) return;

    if (isEligibleForFeedback(campaignConfig)) {
      setIsOpen(true);
      trackEvent("student_feedback_shown", {
        version: campaignConfig.version,
        trigger: "paper_browsing",
      });
    }
  }, [campaignConfig]);

  useEffect(() => {
    if (!campaignConfig.enabled) return;

    const timer = setTimeout(() => {
      checkEligibility();
    }, 2000);

    const handlePaperEngaged = () => {
      setTimeout(() => {
        checkEligibility();
      }, 1000);
    };

    window.addEventListener("pyq_paper_engaged", handlePaperEngaged);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("pyq_paper_engaged", handlePaperEngaged);
    };
  }, [campaignConfig, checkEligibility]);

  const handleDismiss = () => {
    recordFeedbackDismissal(campaignConfig.version);
    setIsOpen(false);
    trackEvent("student_feedback_dismissed", {
      step,
      version: campaignConfig.version,
    });
    executePendingDownload();
  };

  const handleDone = () => {
    setIsOpen(false);
    executePendingDownload();
  };

  const handleRatingSelect = (selected: number) => {
    setRating(selected);
    trackEvent("student_rating_selected", {
      rating: selected,
      version: campaignConfig.version,
    });
  };

  const handleProceedFromRating = () => {
    if (rating === 0) return;

    if (rating <= 3) {
      setStep("feedback_1to3");
    } else {
      setStep("support_4to5");
      recordFeedbackCompletion(campaignConfig.version ?? DEFAULT_VERSION);
      trackEvent("student_feedback_submitted", {
        rating,
        version: campaignConfig.version,
      });
    }
  };

  const handleSubmitConstructiveFeedback = () => {
    recordFeedbackCompletion(campaignConfig.version ?? DEFAULT_VERSION);
    trackEvent("student_feedback_submitted", {
      rating,
      tags: selectedTags,
      comment: comment.trim() || undefined,
      version: campaignConfig.version,
    });
    setStep("thankyou");
    setTimeout(() => {
      setIsOpen(false);
    }, 2500);
  };

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const currentUpiUrl = useMemo(() => {
    return generateUpiUrl(
      campaignConfig.upi_id || DEFAULT_UPI_ID,
      campaignConfig.upi_name || DEFAULT_UPI_NAME,
      amount,
      "Support PyqVitAp"
    );
  }, [campaignConfig.upi_id, campaignConfig.upi_name, amount]);

  const handleCopyUpiId = () => {
    if (typeof navigator !== "undefined" && campaignConfig.upi_id) {
      navigator.clipboard.writeText(campaignConfig.upi_id);
      setCopiedUpi(true);
      trackEvent("student_support_clicked", {
        action: "copy_upi_id",
        version: campaignConfig.version,
      });
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <aside
      aria-label="Student Feedback and Support"
      className="fixed z-50 w-[calc(100vw-2rem)] max-w-md sm:w-[440px] bottom-4 right-4 sm:bottom-auto sm:top-20 sm:right-6 animate-in fade-in slide-in-from-bottom-5 sm:slide-in-from-top-4 duration-300"
    >
      {/* Outer Card with rich deep gradient background */}
      <div className="relative overflow-hidden rounded-3xl border border-violet-500/25 bg-gradient-to-b from-[#190f38] via-[#100826] to-[#070114] p-5 sm:p-6 shadow-2xl shadow-purple-950/60 backdrop-blur-xl text-slate-100 dark:border-violet-500/20">
        
        {/* Expanded ambient glow covering upper and lower corners */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-600/25 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-purple-700/20 blur-3xl" />

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute right-4 top-4 rounded-xl p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
          title="Dismiss"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* ======================================================== */}
        {/* STEP 1: RATING SELECTION (CLEAN, NO BOX, THEME STARS)    */}
        {/* ======================================================== */}
        {step === "rating" && (
          <div className="space-y-5">
            {/* Top icon and header */}
            <div className="space-y-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-300 border border-violet-400/20 shadow-inner">
                <Heart className="h-5 w-5 fill-violet-400/30 text-violet-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold tracking-tight text-white sm:text-xl">
                  How has PyqVitAp helped you prepare?
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-300/80">
                  Takes 5 seconds and helps to maintain and improve the platform for everyone.
                </p>
              </div>
            </div>

            {/* Clean Stars: Unboxed, Theme Violet/Purple */}
            <div className="flex items-center justify-center gap-3 py-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = star <= (hoverRating || rating);
                return (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => handleRatingSelect(star)}
                    className="p-1 transition-transform hover:scale-125 focus:outline-none"
                    aria-label={`${star} star`}
                  >
                    <Star
                      className={`h-9 w-9 sm:h-10 sm:w-10 transition-colors ${
                        isFilled
                          ? "fill-violet-400 text-violet-400 drop-shadow-[0_0_10px_rgba(167,139,250,0.5)]"
                          : "fill-transparent text-slate-600 hover:text-violet-400"
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Smart Button: Branching logic */}
            <button
              onClick={handleProceedFromRating}
              disabled={rating === 0}
              className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3 px-4 text-xs font-semibold text-white transition sm:text-sm ${
                rating === 0
                  ? "cursor-not-allowed bg-violet-600/30 text-slate-400"
                  : "bg-violet-600 hover:bg-violet-500 shadow-lg shadow-violet-950/40"
              }`}
            >
              <span>{rating > 0 && rating <= 3 ? `Tell us how to improve (${rating}★)` : "Continue"}</span>
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 2A: CONSTRUCTIVE FEEDBACK (1 - 3 STARS)             */}
        {/* ======================================================== */}
        {step === "feedback_1to3" && (
          <div className="space-y-4">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-amber-400">
                We hear you
              </span>
              <h3 className="text-base font-bold text-white sm:text-lg">
                We&apos;re sorry it wasn&apos;t a 5-star experience!
              </h3>
              <p className="text-xs text-slate-300">
                PyqVitAp is built by a fellow student. What went wrong or how can we improve?
              </p>
            </div>

            {/* Quick chips */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300">
                What was the issue? (Optional)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_ISSUES.map((issue) => {
                  const isSelected = selectedTags.includes(issue);
                  return (
                    <button
                      key={issue}
                      type="button"
                      onClick={() => handleToggleTag(issue)}
                      className={`rounded-xl border px-3 py-1 text-xs transition ${
                        isSelected
                          ? "border-violet-500 bg-violet-600 text-white"
                          : "border-white/10 bg-white/5 text-slate-300 hover:border-violet-400"
                      }`}
                    >
                      {issue}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Details text area */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300">
                Details or suggestions (Optional):
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="e.g. Missing 2024 Winter FAT papers for CSE3001..."
                className="w-full resize-none rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleSubmitConstructiveFeedback}
                className="flex-1 rounded-2xl bg-violet-600 py-2.5 px-4 text-xs font-semibold text-white shadow-md transition hover:bg-violet-500"
              >
                Submit Feedback
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="rounded-2xl bg-white/10 py-2.5 px-4 text-xs font-medium text-slate-300 transition hover:bg-white/20"
              >
                Skip
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 2B: SUPPORT THE WEBSITE (MATCHING REFERENCE IMAGE)  */}
        {/* ======================================================== */}
        {step === "support_4to5" && (
          <div className="space-y-4">
            {/* Header & Subtitle */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-emerald-400">
                Thank you, Response Recorded!
              </p>
              <h3 className="text-lg font-bold text-white sm:text-xl">
                Support the Website 💜
              </h3>
              <p className="text-xs leading-relaxed text-slate-300">
                This website is built and maintained by a student, in his own time, and is free with no ads. If it has been useful, here are a few ways to help:
              </p>
            </div>

            {/* 3 Support Options Cards (Matching Reference Image) */}
            <div className="space-y-2.5">
              
              {/* Card 1: Star it on GitHub */}
              <a
                href={campaignConfig.github_repo || DEFAULT_GITHUB_REPO}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  trackEvent("student_support_clicked", {
                    action: "github_star",
                    version: campaignConfig.version,
                  })
                }
                className="group flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 transition hover:bg-white/[0.08] hover:border-violet-500/40"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
                    <Star className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white sm:text-sm">Star it on GitHub</h4>
                    <p className="text-[11px] text-slate-400">Free, takes a second, and helps others find it</p>
                  </div>
                </div>
                <ArrowUpRight className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" />
              </a>

              {/* Card 2: Contribute */}
              <a
                href={`${campaignConfig.github_repo || DEFAULT_GITHUB_REPO}/issues`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  trackEvent("student_support_clicked", {
                    action: "contribute",
                    version: campaignConfig.version,
                  })
                }
                className="group flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 transition hover:bg-white/[0.08] hover:border-violet-500/40"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
                    <Code2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white sm:text-sm">Contribute</h4>
                    <p className="text-[11px] text-slate-400">Report a bug, suggest a feature, or send a fix</p>
                  </div>
                </div>
                <ArrowUpRight className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" />
              </a>

              {/* Card 3: Send a coffee (Click to Reveal UPI / QR) */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 transition hover:border-violet-500/40">
                <button
                  type="button"
                  onClick={() => setShowCoffeePayment((prev) => !prev)}
                  className="group flex w-full items-center justify-between gap-3 text-left focus:outline-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
                      <Coffee className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white sm:text-sm">Send a coffee</h4>
                      <p className="text-[11px] text-slate-400">Any amount, through your usual UPI app</p>
                    </div>
                  </div>
                  <ArrowUpRight
                    className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${
                      showCoffeePayment ? "rotate-90 text-violet-400" : "group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white"
                    }`}
                  />
                </button>

                {/* Amount options and QR code reveal ONLY when clicked */}
                {showCoffeePayment && (
                  <div className="mt-3.5 space-y-3 border-t border-white/10 pt-3.5 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-300">
                        Choose amount:
                      </span>
                      <button
                        type="button"
                        onClick={() => setForceDesktopQr((prev) => !prev)}
                        className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-300 transition hover:bg-white/10"
                      >
                        {isMobileDevice && !forceDesktopQr ? "Show QR Code" : "App Link"}
                      </button>
                    </div>

                    {/* Amount chips */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {AMOUNT_PRESETS.map((preset) => {
                        const isActive = amount === preset && !customAmount;
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => {
                              setAmount(preset);
                              setCustomAmount("");
                            }}
                            className={`rounded-xl px-3 py-1 text-xs font-bold transition ${
                              isActive
                                ? "bg-violet-600 text-white shadow-md shadow-violet-900/40"
                                : "border border-white/10 bg-white/5 text-slate-300 hover:border-violet-400"
                            }`}
                          >
                            ₹{preset}
                          </button>
                        );
                      })}
                      <div className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-slate-300">
                        <span>₹</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="Custom"
                          value={customAmount}
                          onChange={(e) => {
                            const numericOnly = e.target.value.replace(/[^0-9]/g, "");
                            setCustomAmount(numericOnly);
                            const num = parseInt(numericOnly, 10);
                            if (num > 0) setAmount(num);
                          }}
                          onKeyDown={(e) => {
                            if (
                              !/^[0-9]$/.test(e.key) &&
                              !["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key)
                            ) {
                              e.preventDefault();
                            }
                          }}
                          className="w-16 bg-transparent pl-1 text-xs text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    </div>

                    {/* Mobile 1-Tap Link */}
                    {isMobileDevice && !forceDesktopQr ? (
                      <a
                        href={currentUpiUrl}
                        onClick={() =>
                          trackEvent("student_support_clicked", {
                            action: "upi_intent",
                            amount,
                            version: campaignConfig.version,
                          })
                        }
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 py-2.5 px-4 text-xs font-bold text-white shadow-md shadow-violet-900/30 transition hover:opacity-95"
                      >
                        <span>✨ Pay ₹{amount} with UPI (GPay / PhonePe / Paytm)</span>
                      </a>
                    ) : (
                      /* Desktop Scannable QR */
                      <div className="flex flex-col items-center justify-center space-y-2 rounded-2xl border border-slate-700 bg-white p-3 text-slate-900">
                        <p className="text-[11px] font-semibold text-slate-700">
                          Scan with any UPI app to send ₹{amount}:
                        </p>
                        <UpiQrCode upiUrl={currentUpiUrl} size={150} />
                        <div className="flex items-center gap-2 text-[11px] text-slate-600">
                          <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[10px]">
                            {campaignConfig.upi_id}
                          </span>
                          <button
                            type="button"
                            onClick={handleCopyUpiId}
                            className="font-semibold text-violet-600 hover:underline"
                          >
                            {copiedUpi ? "Copied!" : "Copy"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Note Text: OUTSIDE any box, clean and visible */}
            <p className="px-1 text-center text-[11px] leading-relaxed text-slate-400">
              *Note : Nothing above is required, and contributors receive nothing in return — no extra features are added, and no special badges. The site remains 100% identical and open for everyone either way.
            </p>

            {/* Done Button */}
            <button
              type="button"
              onClick={handleDone}
              className="w-full rounded-2xl bg-violet-600 hover:bg-violet-500 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-violet-950/40 transition"
            >
              Done 👍🏻
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 3: THANK YOU CLOSING                                */}
        {/* ======================================================== */}
        {step === "thankyou" && (
          <div className="space-y-3 py-3 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/20 text-xl text-violet-300">
              💜
            </div>
            <h4 className="text-sm font-bold text-white">
              Thank you, Response Recorded!
            </h4>
            <p className="text-xs text-slate-300">
              Your feedback helps keep PyqVitAp improving for everyone.
            </p>
            <button
              type="button"
              onClick={handleDone}
              className="w-full rounded-2xl bg-violet-600 hover:bg-violet-500 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-violet-950/40 transition"
            >
              Done 👍🏻
            </button>
          </div>
        )}

      </div>
    </aside>
  );
}
