"use client";

import React from "react";
import AppErrorView from "@/components/error/AppErrorView";

export default function RootError({
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
      title="An unexpected error occurred"
      description="PyqVitAp encountered an issue while loading this section. You can retry the action or return to the main catalogue."
    />
  );
}
