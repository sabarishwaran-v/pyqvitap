"use client";

import React, { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home, ArrowLeft } from "lucide-react";

interface AppErrorViewProps {
  error?: Error & { digest?: string };
  reset?: () => void;
  title?: string;
  description?: string;
  isGlobal?: boolean;
}

export default function AppErrorView({
  error,
  reset,
  title = "Something went wrong",
  description = "An unexpected error occurred while loading this page. Our team has been notified. You can retry the request or return to the homepage.",
  isGlobal = false,
}: AppErrorViewProps) {
  const [isRetrying, startTransition] = useTransition();
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // Log sanitized error details for client-side observability without exposing secrets
    console.error("[PyqVitAp AppError]", {
      message: error?.message,
      digest: error?.digest,
    });
  }, [error]);

  const handleRetry = () => {
    if (isRetrying) return;
    setRetryCount((prev) => prev + 1);
    startTransition(() => {
      if (reset) {
        reset();
      } else {
        window.location.reload();
      }
    });
  };

  const content = (
    <div className="relative flex min-h-[70vh] w-full flex-col items-center justify-center px-4 py-12 text-zinc-900 transition-colors duration-300 dark:text-zinc-100">
      {/* Background ambient radial glow accents */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[400px] w-[400px] rounded-full bg-purple-600/15 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[400px] w-[400px] rounded-full bg-indigo-600/15 blur-[140px]" />

      <div className="relative z-10 mx-auto w-full max-w-lg overflow-hidden rounded-3xl border border-zinc-200/80 bg-white/85 p-8 shadow-2xl backdrop-blur-xl dark:border-purple-500/20 dark:bg-[#0c061d]/90 md:p-10">
        <div className="flex flex-col items-center text-center">
          {/* Logo & Brand Header */}
          <div className="mb-6 flex items-center gap-3">
            <Image
              src="/assets/images/navbar_logo.png?v=5"
              alt="PyqVitAp Logo"
              width={42}
              height={42}
              priority
              className="h-10 w-10 rounded-xl shadow-md"
            />
            <span className="bg-gradient-to-r from-[#562EE7] to-[rgba(116,128,255,0.8)] bg-clip-text font-jost text-2xl font-extrabold tracking-wide text-transparent dark:from-[#562EE7] dark:to-[#FFC6E8]">
              PyqVitAp
            </span>
          </div>

          {/* Warning Icon Badge */}
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-500 shadow-inner dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-400">
            <AlertTriangle className="h-7 w-7" />
          </div>

          {/* Error Message */}
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-2xl">
            {title}
          </h1>
          <p className="mt-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300 sm:text-sm">
            {description}
          </p>

          {/* Reference code for debugging without leaking internal stack trace */}
          {error?.digest && (
            <div className="mt-4 rounded-lg border border-purple-500/20 bg-purple-50/50 px-3 py-1 font-mono text-[11px] text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
              Error Reference: {error.digest}
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleRetry}
              disabled={isRetrying}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-600/25 transition hover:from-purple-700 hover:to-indigo-700 active:scale-[0.98] disabled:opacity-60"
            >
              <RotateCcw
                className={`h-4 w-4 ${isRetrying ? "animate-spin" : ""}`}
              />
              <span>{isRetrying ? "Retrying..." : "Retry"}</span>
            </button>

            <Link
              href="/"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white/80 px-5 py-3 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 active:scale-[0.98] dark:border-purple-500/30 dark:bg-[#181033] dark:text-zinc-200 dark:hover:bg-[#201642]"
            >
              <Home className="h-4 w-4" />
              <span>Return Home</span>
            </Link>
          </div>

          {retryCount > 1 && (
            <p className="mt-4 text-[11px] text-zinc-500 dark:text-zinc-400">
              If the problem persists, please check your network connection or try again later.
            </p>
          )}
        </div>
      </div>
    </div>
  );

  if (isGlobal) {
    return (
      <html lang="en" className="dark">
        <body className="bg-[#F3F5FF] dark:bg-[#070114]">
          {content}
        </body>
      </html>
    );
  }

  return content;
}
