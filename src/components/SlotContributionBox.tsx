"use client";

import React, { useState, useEffect } from "react";
import { AUTHORITATIVE_SLOTS, type AuthoritativeSlot } from "@/lib/constants/slots";
import {
  getOrCreateContributorId,
  hasContributedLocally,
  markContributedLocally,
  hasSkippedLocally,
  markSkippedLocally,
} from "@/lib/utils/contributor";
import type { ApiResponse, SlotCrowdsourceStatus } from "@/interface";
import { CheckCircle2, HelpCircle } from "lucide-react";
import toast from "react-hot-toast";

interface SlotContributionBoxProps {
  paperId: string;
  initialSlot?: string;
  slotSource?: "dspace" | "manual" | "crowdsourced";
  slotContributionCount?: number;
}

export default function SlotContributionBox({
  paperId,
  initialSlot = "",
  slotSource,
  slotContributionCount = 0,
}: SlotContributionBoxProps) {
  const [slot, setSlot] = useState<string>(initialSlot);
  const [source, setSource] = useState<string | undefined>(slotSource);
  const [totalContributions, setTotalContributions] = useState<number>(slotContributionCount);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [userContributed, setUserContributed] = useState<boolean>(false);
  const [isSkipped, setIsSkipped] = useState<boolean>(false);
  const [isConfirmed, setIsConfirmed] = useState<boolean>(Boolean(initialSlot && slotSource === "crowdsourced"));

  useEffect(() => {
    if (!paperId) return;

    // Check client-side storage first
    const contributed = hasContributedLocally(paperId);
    const skipped = hasSkippedLocally(paperId);
    setUserContributed(contributed);
    setIsSkipped(skipped);

    // If paper already has a normal slot, do not poll
    if (initialSlot && slotSource !== "crowdsourced") {
      return;
    }

    // Fetch fresh status from the server
    const contributorId = getOrCreateContributorId();
    fetch(`/api/slot-contribution?paperId=${encodeURIComponent(paperId)}&contributorId=${encodeURIComponent(contributorId)}`)
      .then(async (res) => {
        if (!res.ok) return null;
        const data = (await res.json()) as ApiResponse<SlotCrowdsourceStatus>;
        return data.data;
      })
      .then((status) => {
        if (status) {
          if (status.isConfirmed && status.currentSlot) {
            setSlot(status.currentSlot);
            setSource(status.slotSource ?? "crowdsourced");
            setIsConfirmed(true);
          }
          if (typeof status.totalContributions === "number") {
            setTotalContributions(status.totalContributions);
          }
          if (status.userContributed) {
            setUserContributed(true);
            markContributedLocally(paperId);
          }
        }
      })
      .catch(() => {
        // Non-blocking fail-safe
      });
  }, [paperId, initialSlot, slotSource]);

  // 1. If paper has an existing authoritative slot (non-crowdsourced), do not show crowdsourcing UI
  if (slot && source !== "crowdsourced") {
    return null;
  }

  // 2. If paper slot has been confirmed via crowdsourcing, show the authoritative confirmation tag
  if (slot && (source === "crowdsourced" || isConfirmed)) {
    return (
      <div className="mx-auto my-3 flex max-w-2xl items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-50/90 px-3.5 py-2 text-xs font-play text-emerald-950 shadow-sm backdrop-blur-sm dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-200">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="font-semibold text-sm">Slot: {slot} ✓</span>
          <span className="text-[11px] opacity-80">· Confirmed from student contributions</span>
        </div>
        {totalContributions > 0 && (
          <span className="text-[11px] opacity-75 font-medium">
            {totalContributions} contribution{totalContributions > 1 ? "s" : ""}
          </span>
        )}
      </div>
    );
  }

  // 3. User already contributed previously
  if (userContributed) {
    return (
      <div className="mx-auto my-3 flex max-w-2xl items-center justify-between rounded-xl border border-[#7480FF]/30 bg-white/90 px-4 py-2.5 font-play text-xs text-gray-700 shadow-sm backdrop-blur-sm dark:border-[#3A3745] dark:bg-[#130E1F]/90 dark:text-gray-300">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span className="font-medium">Thanks! Your contribution was recorded.</span>
        </div>
        <span className="text-[11px] text-gray-500 dark:text-gray-400">
          {totalContributions > 0
            ? `${totalContributions} student${totalContributions > 1 ? "s have" : " has"} contributed`
            : ""}
        </span>
      </div>
    );
  }

  // 4. User skipped the section for this session
  if (isSkipped) {
    return (
      <div className="mx-auto my-2 max-w-2xl text-center">
        <button
          type="button"
          onClick={() => setIsSkipped(false)}
          className="text-[11px] font-play text-gray-500 underline underline-offset-2 transition hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Know the slot for this paper? Help add it
        </button>
      </div>
    );
  }

  // 5. Active contribution form
  const handleSkip = () => {
    setIsSkipped(true);
    markSkippedLocally(paperId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) {
      toast.error("Please select a slot.");
      return;
    }

    setIsSubmitting(true);
    try {
      const contributorId = getOrCreateContributorId();
      const res = await fetch("/api/slot-contribution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paperId,
          slot: selectedSlot,
          contributorId,
        }),
      });

      const json = (await res.json()) as ApiResponse<{
        status: "recorded" | "confirmed";
        isConfirmed: boolean;
        confirmedSlot: string | null;
        totalContributions: number;
        message: string;
      }>;

      if (!res.ok || json.status === "error") {
        throw new Error(json.message || "Failed to submit contribution.");
      }

      markContributedLocally(paperId);
      setUserContributed(true);

      if (json.data?.isConfirmed && json.data.confirmedSlot) {
        setSlot(json.data.confirmedSlot);
        setSource("crowdsourced");
        setIsConfirmed(true);
        setTotalContributions(json.data.totalContributions);
        toast.success(`Consensus reached! Slot confirmed as ${json.data.confirmedSlot}.`);
      } else {
        const newTotal = json.data?.totalContributions ?? totalContributions + 1;
        setTotalContributions(newTotal);
        toast.success("Thanks! Your contribution was recorded.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to record contribution.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render minimal contextual box
  return (
    <div className="mx-auto my-3 max-w-2xl rounded-xl border border-[#7480FF]/30 bg-white/95 p-3.5 shadow-sm backdrop-blur-md dark:border-[#3A3745] dark:bg-[#130E1F]/95 sm:p-4 font-play">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: Metadata info & polite prompt */}
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300">
              <HelpCircle className="h-3 w-3" />
              Slot not available
            </span>
            {totalContributions > 0 && (
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                {totalContributions < 10
                  ? `${totalContributions} student${totalContributions > 1 ? "s have" : " has"} contributed`
                  : `${totalContributions} students contributed · Consensus pending`}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-300">
            Know the slot? You can help add it for other students.
          </p>
        </div>

        {/* Right: Inline selection & actions */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <label htmlFor={`slot-select-${paperId}`} className="sr-only">
            Select Slot
          </label>
          <select
            id={`slot-select-${paperId}`}
            value={selectedSlot}
            onChange={(e) => setSelectedSlot(e.target.value)}
            disabled={isSubmitting}
            className="h-8 rounded-lg border border-[#3A3745]/40 bg-gray-50 px-2.5 text-xs font-semibold text-gray-800 transition focus:border-[#7480FF] focus:outline-none dark:border-[#3A3745] dark:bg-[#1E1B2E] dark:text-white"
          >
            <option value="">Select slot</option>
            {AUTHORITATIVE_SLOTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={!selectedSlot || isSubmitting}
            className="h-8 rounded-lg bg-[#562EE7] px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#4722c9] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "..." : "Submit"}
          </button>

          <button
            type="button"
            onClick={handleSkip}
            disabled={isSubmitting}
            className="px-2 py-1 text-xs font-medium text-gray-400 transition hover:text-gray-700 dark:hover:text-gray-200"
          >
            Skip
          </button>
        </form>
      </div>
    </div>
  );
}
