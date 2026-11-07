import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ArrowLeft, MailX, AlertCircle } from "lucide-react";
import { unsubscribeEmail } from "@/lib/services/subscribe";
import UnsubscribeForm from "@/components/UnsubscribeForm";

export const metadata: Metadata = {
  title: "Unsubscribe | PyqVitAp",
  description: "Unsubscribe from PyqVitAp email notifications and exam updates.",
};

interface UnsubscribePageProps {
  searchParams: { email?: string };
}

export default async function UnsubscribePage({ searchParams }: UnsubscribePageProps) {
  const rawEmail = searchParams.email?.trim().toLowerCase();
  let status: "success" | "no-email" | "error" = "no-email";
  let errorMessage = "";

  if (rawEmail) {
    try {
      await unsubscribeEmail(rawEmail);
      status = "success";
    } catch (err) {
      console.error("[Unsubscribe] Failed to unsubscribe:", err);
      status = "error";
      errorMessage = err instanceof Error ? err.message : "Failed to unsubscribe. Please try again.";
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-140px)] items-center justify-center px-4 py-12 text-black dark:text-white sm:px-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white/80 p-6 text-center shadow-lg backdrop-blur-md dark:border-[#3A3745] dark:bg-[#130E1F]/90 sm:p-8">
        {/* Branding header */}
        <div className="mb-6 flex justify-center">
          <Link
            href="/"
            className="bg-gradient-to-r from-[#562EE7] to-[rgba(116,128,255,0.8)] bg-clip-text font-jost text-2xl font-bold tracking-wide text-transparent dark:to-[#FFC6E8]"
          >
            PyqVitAp
          </Link>
        </div>

        {status === "success" && (
          <div className="space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <h1 className="font-jost text-2xl font-bold text-black dark:text-white">
              Unsubscribed
            </h1>

            <p className="font-play text-sm text-gray-700 dark:text-gray-300">
              You have been successfully unsubscribed from PyqVitAp updates.
            </p>

            <p className="font-play text-xs text-gray-500 dark:text-gray-400">
              You will no longer receive notifications or exam digests at{" "}
              <span className="font-semibold text-black dark:text-white">{rawEmail}</span>.
            </p>

            <div className="pt-4">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-xl bg-[#562EE7] px-5 py-2.5 font-play text-xs font-semibold text-white transition hover:bg-[#4531b3] active:scale-[0.99] dark:bg-[#562EE7] dark:hover:bg-[#4531b3]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Return to Homepage</span>
              </Link>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-500 dark:bg-red-500/20">
              <AlertCircle className="h-8 w-8" />
            </div>

            <h1 className="font-jost text-2xl font-bold text-black dark:text-white">
              Unable to Unsubscribe
            </h1>

            <p className="font-play text-sm text-gray-700 dark:text-gray-300">
              {errorMessage}
            </p>

            <div className="pt-4">
              <Link
                href="/unsubscribe"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-5 py-2.5 font-play text-xs font-semibold text-gray-800 transition hover:bg-black/5 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/5"
              >
                <span>Try Entering Email Manually</span>
              </Link>
            </div>
          </div>
        )}

        {status === "no-email" && (
          <div className="space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#562EE7]/10 text-[#562EE7] dark:bg-[#A47DE5]/20 dark:text-[#A47DE5]">
              <MailX className="h-8 w-8" />
            </div>

            <h1 className="font-jost text-2xl font-bold text-black dark:text-white">
              Unsubscribe from Updates
            </h1>

            <p className="font-play text-xs text-gray-600 dark:text-gray-400">
              Enter the email address you subscribed with to stop receiving PyqVitAp exam pack digests and notifications.
            </p>

            <div className="pt-2">
              <UnsubscribeForm />
            </div>

            <div className="pt-3">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 font-play text-xs text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white"
              >
                <ArrowLeft className="h-3 w-3" />
                <span>Never mind, return to Homepage</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
