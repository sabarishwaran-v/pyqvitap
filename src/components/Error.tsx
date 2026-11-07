"use client";

import React, { useTransition } from "react";
import { AlertTriangle, RotateCcw, Search, Home } from "lucide-react";
import Link from "next/link";

interface ErrorProps {
  message?: string;
  filtersPulled?: boolean;
  onRetry?: () => void;
  showHomeLink?: boolean;
}

const Error = ({
  message = "An error occurred while loading question papers.",
  filtersPulled = false,
  onRetry,
  showHomeLink = true,
}: ErrorProps) => {
  const [isRetrying, startTransition] = useTransition();

  const handleRetry = () => {
    if (isRetrying) return;
    startTransition(() => {
      if (onRetry) {
        onRetry();
      } else {
        window.location.reload();
      }
    });
  };

  return (
    <div
      className={`flex min-h-[50vh] flex-1 flex-col items-center justify-center px-4 py-8 text-center transition-all duration-300 ${
        filtersPulled ? "blur-xl" : ""
      }`}
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-zinc-200/80 bg-white/85 p-6 shadow-xl backdrop-blur-xl dark:border-purple-500/20 dark:bg-[#0c061d]/90 sm:p-8">
        <div className="flex flex-col items-center">
          {/* Warning Icon Badge */}
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-500 shadow-inner dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-400">
            <AlertTriangle className="h-6 w-6" />
          </div>

          <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white sm:text-xl">
            Unable to Load Papers
          </h3>

          <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300 sm:text-sm">
            {message}
          </p>

          <div className="mt-6 flex w-full flex-col gap-2.5 sm:flex-row">
            {onRetry && (
              <button
                type="button"
                onClick={handleRetry}
                disabled={isRetrying}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-purple-600/25 transition hover:from-purple-700 hover:to-indigo-700 active:scale-[0.98] disabled:opacity-60"
              >
                <RotateCcw
                  className={`h-3.5 w-3.5 ${isRetrying ? "animate-spin" : ""}`}
                />
                <span>{isRetrying ? "Retrying..." : "Try Again"}</span>
              </button>
            )}

            {showHomeLink && (
              <Link
                href="/"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white/80 px-4 py-2.5 text-xs font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 active:scale-[0.98] dark:border-purple-500/30 dark:bg-[#181033] dark:text-zinc-200 dark:hover:bg-[#201642]"
              >
                <Home className="h-3.5 w-3.5" />
                <span>Return Home</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Error;
