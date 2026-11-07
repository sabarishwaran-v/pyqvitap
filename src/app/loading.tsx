import React from "react";
import Loader from "@/components/ui/loader";

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center">
      <Loader />
    </div>
  );
}
