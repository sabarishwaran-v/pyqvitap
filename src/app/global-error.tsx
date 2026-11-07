"use client";

import React from "react";
import AppErrorView from "@/components/error/AppErrorView";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AppErrorView
      error={error}
      reset={reset}
      title="Application error"
      description="The application encountered a critical error. You can retry loading the page or return to the PyqVitAp homepage."
      isGlobal={true}
    />
  );
}
