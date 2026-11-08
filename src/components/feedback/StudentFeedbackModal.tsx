"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { usePostHog } from "posthog-js/react";
import dynamic from "next/dynamic";
import { trackEvent } from "@/lib/telemetry";
import {
  DEFAULT_COOLDOWN_DAYS,
  DEFAULT_GITHUB_REPO,
  DEFAULT_MIN_DURATION_SECONDS,
  DEFAULT_MIN_PAPERS,
  DEFAULT_VERSION,
  generateUpiUrl,
  isEligibleForFeedback,
  recordFeedbackCompletion,
  recordFeedbackDismissal,
} from "@/lib/feedback";
import type { FeedbackCampaignPayload } from "@/lib/feedback/types";

// Dynamically import QR Code canvas to ensure client-only rendering
const UpiQrCode = dynamic(() => import("./UpiQrCode"), { ssr: false });

const STAR_LABELS: Record<number, string> = {
  1: "1 Star • Needs major improvement",
  2: "2 Stars • Mediocre / Missing content",
  3: "3 Stars • Decent / Needs polish",
  4: "4 Stars • Very helpful! 👍",
  5: "5 Stars • Outstanding resource! 🚀",
};

const COMMON_ISSUES = [
  "Missing Exam Papers",
  "Search Not Accurate",
  "Slow Loading",
  "Download Problem",
  "Mobile UI Confusing",
  "Other",
];

const AMOUNT_PRESETS = [10, 20, 50, 100];

export default function StudentFeedbackModal() {
  const posthog = usePostHog();

  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"rating" | "feedback_1to3" | "support_4to5" | "thankyou">("rating");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [amount, setAmount] = useState(20);
  const [customAmount, setCustomAmount] = useState("");
  const [showCoffeePayment, setShowCoffeePayment] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(true);
  const [forceDesktopQr, setForceDesktopQr] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Extract flag payload from PostHog or env fallback
  const campaignConfig = useMemo<FeedbackCampaignPayload>(() => {
    let payloadFromFlag: FeedbackCampaignPayload | null = null;

    if (posthog) {
      const rawPayload = posthog.getFeatureFlagPayload("student-feedback-campaign");
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
    }

    const flagEnabled = posthog ? posthog.isFeatureEnabled("student-feedback-campaign") : undefined;

    // Check env fallback if flag is undefined
    const envEnabled = process.env.NEXT_PUBLIC_FEEDBACK_CAMPAIGN_ENABLED === "true";
    const isDev = process.env.NODE_ENV === "development";

    let isEnabled = false;
    if (payloadFromFlag?.enabled !== undefined) {
      isEnabled = payloadFromFlag.enabled;
    } else if (flagEnabled) {
      isEnabled = true;
    } else if (envEnabled) {
      isEnabled = true;
    } else if (isDev && process.env.NEXT_PUBLIC_FEEDBACK_CAMPAIGN_ENABLED !== "false") {
      // In local dev, enable by default for easy review unless explicitly disabled
      isEnabled = true;
    }

    return {
      enabled: isEnabled,
      version: payloadFromFlag?.version ?? Number(process.env.NEXT_PUBLIC_FEEDBACK_CAMPAIGN_VERSION || DEFAULT_VERSION),
      min_papers: payloadFromFlag?.min_papers ?? DEFAULT_MIN_PAPERS,
      min_duration_seconds: payloadFromFlag?.min_duration_seconds ?? DEFAULT_MIN_DURATION_SECONDS,
      cooldown_days: payloadFromFlag?.cooldown_days ?? DEFAULT_COOLDOWN_DAYS,
      upi_id: payloadFromFlag?.upi_id || process.env.NEXT_PUBLIC_UPI_ID || "sabarishvenkat@ptsbi",
      upi_name: payloadFromFlag?.upi_name || process.env.NEXT_PUBLIC_UPI_NAME || "Sabarishwaran V",
      github_repo: payloadFromFlag?.github_repo || DEFAULT_GITHUB_REPO,
    };
  }, [posthog]);

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

  // Trigger evaluation
  const checkEligibility = useCallback(() => {
    if (!campaignConfig.enabled) return;

    if (isEligibleForFeedback(campaignConfig)) {
      setIsOpen(true);
      trackEvent("student_feedback_shown", {
        version: campaignConfig.version,
      });
    }
  }, [campaignConfig]);

  useEffect(() => {
    if (!campaignConfig.enabled) return;

    // Initial check on mount
    const timer = setTimeout(() => {
      checkEligibility();
    }, 2000);

    // Event-based check when papers are clicked/downloaded
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

  // Handle closing/dismissal
  const handleDismiss = () => {
    recordFeedbackDismissal();
    setIsOpen(false);
    trackEvent("student_feedback_dismissed", {
      step,
      version: campaignConfig.version,
    });
  };

  // Step 1: Select rating
  const handleRatingSelect = (selected: number) => {
    setRating(selected);
    trackEvent("student_rating_selected", {
      rating: selected,
      version: campaignConfig.version,
    });
  };

  // Proceed to Step 2
  const handleProceedFromRating = () => {
    if (rating === 0) return;

    if (rating <= 3) {
      setStep("feedback_1to3");
    } else {
      setStep("support_4to5");
      // Record completion of rating part
      recordFeedbackCompletion(campaignConfig.version ?? DEFAULT_VERSION);
      trackEvent("student_feedback_submitted", {
        rating,
        version: campaignConfig.version,
      });
    }
  };

  // Step 2A: Submit constructive feedback
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

  // Tag toggle helper
  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // UPI deep link
  const currentUpiUrl = useMemo(() => {
    return generateUpiUrl(
      campaignConfig.upi_id || "sabarishvenkat@ptsbi",
      campaignConfig.upi_name || "Sabarishwaran V",
      amount,
      "PyqVitAp Student Support"
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
    <div
      role="dialog"
      aria-label="Student Feedback and Support"
      className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-md sm:w-[440px] animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="relative overflow-hidden rounded-2xl border border-violet-200/80 bg-white p-5 shadow-2xl shadow-purple-950/20 backdrop-blur-lg dark:border-violet-900/60 dark:bg-[#0c071a] dark:text-slate-100">
        
        {/* Ambient decorative glow */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-violet-600/15 blur-2xl" />

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="absolute right-3.5 top-3.5 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          title="Dismiss"
          aria-label="Close"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* ======================================================== */}
        {/* STEP 1: 5-STAR RATING                                    */}
        {/* ======================================================== */}
        {step === "rating" && (
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-800/40 bg-violet-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700 dark:text-violet-300">
                <span>✨</span> Quick Student Feedback
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 sm:text-lg">
                How has PyqVitAp helped you prepare?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Your rating takes 5 seconds and helps keep past papers free for all VIT-APians.
              </p>
            </div>

            {/* Stars */}
            <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50/80 py-3 dark:border-slate-800/80 dark:bg-slate-950/60">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = star <= (hoverRating || rating);
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => handleRatingSelect(star)}
                      className="p-1 text-2xl transition-transform hover:scale-125 focus:outline-none sm:text-3xl"
                      aria-label={`${star} star`}
                    >
                      {isFilled ? "⭐" : "☆"}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 h-4 text-xs font-semibold text-violet-600 dark:text-violet-400">
                {STAR_LABELS[hoverRating || rating] || "Select a rating"}
              </p>
            </div>

            <button
              onClick={handleProceedFromRating}
              disabled={rating === 0}
              className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs font-semibold text-white transition sm:text-sm ${
                rating === 0
                  ? "cursor-not-allowed bg-violet-600/40"
                  : "bg-violet-600 hover:bg-violet-500 shadow-md shadow-violet-900/20"
              }`}
            >
              <span>{rating > 0 && rating <= 3 ? `Tell us how to improve (${rating}★)` : "Continue"}</span>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 2A: CONSTRUCTIVE FEEDBACK (1 - 3 STARS)             */}
        {/* ======================================================== */}
        {step === "feedback_1to3" && (
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-800/40 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                <span>🛠️</span> We hear you
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                We're sorry it wasn't a 5-star experience!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                PyqVitAp is built by a fellow student. What went wrong or how can we improve?
              </p>
            </div>

            {/* Quick chips */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
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
                      className={`rounded-lg border px-2.5 py-1 text-xs transition ${
                        isSelected
                          ? "border-violet-600 bg-violet-600 text-white"
                          : "border-slate-200 bg-slate-100 text-slate-700 hover:border-violet-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
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
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Details or suggestions (Optional):
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="e.g. Could not find 2024 Winter FAT papers for CSE3001..."
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-violet-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:placeholder-slate-600"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleSubmitConstructiveFeedback}
                className="flex-1 rounded-xl bg-violet-600 py-2.5 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-500"
              >
                Submit Feedback
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="rounded-xl bg-slate-100 py-2.5 px-4 text-xs font-medium text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Skip
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 2B: SUPPORT THE STUDENT DEVELOPER (4 - 5 STARS)     */}
        {/* ======================================================== */}
        {step === "support_4to5" && (
          <div className="space-y-3.5">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-800/40 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                <span>🎉</span> Thank you! Rating saved
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 sm:text-lg">
                PyqVitAp is built & maintained by a student 💜
              </h3>
              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Built in personal time, free for all students, with zero ads. If it has helped your exam prep, here are a few ways to help out:
              </p>
            </div>

            {/* Support cards list */}
            <div className="space-y-2">
              
              {/* 1. Star on GitHub */}
              <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 transition dark:border-slate-800 dark:bg-slate-950/60">
                <div className="flex items-start gap-2.5">
                  <span className="text-lg">⭐</span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200">Star us on GitHub</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Free, takes 1 second, helps others find PyqVitAp and motivates ongoing updates.
                    </p>
                  </div>
                </div>
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
                  className="shrink-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Star ★
                </a>
              </div>

              {/* 2. Contribute */}
              <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 transition dark:border-slate-800 dark:bg-slate-950/60">
                <div className="flex items-start gap-2.5">
                  <span className="text-lg">🛠️</span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200">Contribute</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Report a bug, suggest features, or share missing exam papers.
                    </p>
                  </div>
                </div>
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
                  className="shrink-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Contribute ↗
                </a>
              </div>

              {/* 3. Send Me a Coffee via UPI */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 transition dark:border-slate-800 dark:bg-slate-950/60">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="text-lg">☕</span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200">
                        Send Me a Coffee (UPI)
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Any amount through your usual UPI app. No ₹95 min limit.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCoffeePayment((prev) => !prev)}
                    className="shrink-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 flex items-center gap-1.5"
                  >
                    <span>{showCoffeePayment ? "Close" : "Support"}</span>
                    <span>☕</span>
                  </button>
                </div>

                {/* Amount presets & payment reveal ONLY when clicked */}
                {showCoffeePayment && (
                  <div className="mt-3 space-y-2.5 border-t border-slate-200 pt-3 dark:border-slate-800 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Choose amount:
                      </span>
                      {/* Mode switch */}
                      <button
                        type="button"
                        onClick={() => setForceDesktopQr((prev) => !prev)}
                        className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 transition hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        {isMobileDevice && !forceDesktopQr ? "Show QR Code" : "App Link"}
                      </button>
                    </div>

                    {/* Amount presets */}
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
                            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                              isActive
                                ? "border border-violet-500 bg-violet-600 text-white"
                                : "border border-slate-200 bg-white text-slate-700 hover:border-violet-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            ₹{preset}
                          </button>
                        );
                      })}
                      <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                        <span>₹</span>
                        <input
                          type="number"
                          min={1}
                          placeholder="Custom"
                          value={customAmount}
                          onChange={(e) => {
                            setCustomAmount(e.target.value);
                            const num = parseInt(e.target.value, 10);
                            if (num > 0) setAmount(num);
                          }}
                          className="w-14 bg-transparent pl-1 text-xs text-slate-900 focus:outline-none dark:text-white"
                        />
                      </div>
                    </div>

                    {/* Mobile Intent Button */}
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
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 py-2.5 px-4 text-xs font-bold text-white shadow-md shadow-violet-900/20 transition hover:opacity-95"
                      >
                        <span>✨ Pay ₹{amount} with UPI (GPay / PhonePe / Paytm)</span>
                      </a>
                    ) : (
                      /* Desktop QR View */
                      <div className="flex flex-col items-center justify-center space-y-2 rounded-xl border border-slate-200 bg-white p-2.5 text-slate-900 dark:border-slate-700">
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

            {/* ETHICS & TRANSPARENCY DISCLAIMER (Outside any box, clean and visible) */}
            <p className="px-1 text-center text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              Nothing above is required, and contributors receive nothing in return — no extra features are added, and no special badges. The site remains 100% identical and open for everyone either way.
            </p>

            {/* Done button */}
            <button
              type="button"
              onClick={handleDismiss}
              className="w-full rounded-xl bg-slate-100 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800/70 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Done • Back to Studying ✕
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 3: THANK YOU CLOSING                                */}
        {/* ======================================================== */}
        {step === "thankyou" && (
          <div className="space-y-2 py-4 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-violet-600/20 text-xl text-violet-600 dark:text-violet-400">
              💜
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Thank you for helping us improve!
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Your feedback is directly used to enhance PyqVitAp. Best of luck with your CATs and FATs!
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
