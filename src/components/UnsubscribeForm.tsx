"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function UnsubscribeForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setStatus("error");
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        throw new Error(data.message || "Failed to unsubscribe.");
      }

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  };

  if (status === "success") {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h2 className="font-jost text-xl font-bold text-black dark:text-white sm:text-2xl">
          Unsubscribed
        </h2>
        <p className="font-play text-sm text-gray-600 dark:text-gray-300">
          You have been successfully unsubscribed from PyqVitAp updates.
        </p>
        <p className="font-play text-xs text-gray-500 dark:text-gray-400">
          You will no longer receive exam digests or notifications at <span className="font-semibold text-black dark:text-white">{email}</span>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      <div>
        <label htmlFor="unsub-email" className="block font-play text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Email address
        </label>
        <Input
          id="unsub-email"
          type="email"
          placeholder="your.name@vitapstudent.ac.in"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === "loading"}
          className="ph-no-capture w-full text-sm text-black dark:text-white"
          required
        />
      </div>

      {status === "error" && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-xs text-red-600 dark:bg-red-500/20 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <Button
        type="submit"
        disabled={status === "loading"}
        className="w-full rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 active:scale-[0.99] dark:bg-red-600 dark:hover:bg-red-700"
      >
        {status === "loading" ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Unsubscribing...
          </>
        ) : (
          "Unsubscribe from all updates"
        )}
      </Button>
    </form>
  );
}
