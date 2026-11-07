"use client";

import Link from "next/link";
import Image from "next/image";
import { SignOutButton, useUser } from "@clerk/nextjs";
import { ShieldAlert, LogOut, ArrowLeft } from "lucide-react";

function ClerkUserInfo() {
  const { user, isLoaded } = useUser();
  const currentEmail = user?.primaryEmailAddress?.emailAddress;

  if (!isLoaded || !currentEmail) return null;

  return (
    <div className="mt-3 border-t border-purple-500/20 pt-2 text-xs text-zinc-400">
      <span>Signed in as: </span>
      <span className="font-mono text-red-300">{currentEmail}</span>
    </div>
  );
}

function ClerkSwitchAccountButton() {
  return (
    <SignOutButton>
      <button
        type="button"
        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-600/30 transition hover:bg-purple-700 active:scale-[0.98]"
      >
        <LogOut className="h-4 w-4" />
        Switch Account
      </button>
    </SignOutButton>
  );
}

export default function UnauthorizedPage() {
  const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  return (
    <div className="flex min-h-[85vh] flex-col items-center justify-center px-4 py-12">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-purple-500/20 bg-[#0f0926]/90 p-8 shadow-2xl backdrop-blur-xl md:p-10">
        {/* Glow accent */}
        <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-purple-600/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-indigo-600/20 blur-3xl" />

        {/* Content */}
        <div className="relative flex flex-col items-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 shadow-inner">
            <ShieldAlert className="h-9 w-9 text-purple-400" />
          </div>

          <div className="mb-2 flex items-center gap-2">
            <Image
              src="/assets/images/navbar_logo.png?v=5"
              alt="PyqVitAp Logo"
              width={28}
              height={28}
              className="rounded-md"
            />
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent">
              PyqVitAp
            </span>
          </div>

          <h1 className="mt-2 text-2xl font-extrabold text-white md:text-3xl">
            University account required
          </h1>

          <p className="mt-4 text-sm leading-relaxed text-zinc-300 md:text-base">
            PyqVitAp is available only to verified members of <span className="font-semibold text-purple-300">VIT-AP University</span>.
            Please sign in using your official university account to continue.
          </p>

          <div className="my-6 w-full rounded-xl border border-purple-500/30 bg-purple-950/30 p-4 text-left">
            <div className="text-xs font-semibold uppercase tracking-wider text-purple-400">
              Supported University Email Domains
            </div>
            <div className="mt-1 flex flex-wrap gap-2 font-mono text-sm font-bold text-white">
              <span className="rounded bg-purple-900/40 px-2 py-0.5">@vitapstudent.ac.in</span>
              <span className="rounded bg-purple-900/40 px-2 py-0.5">@vitap.ac.in</span>
            </div>
            {hasClerk && <ClerkUserInfo />}
          </div>

          <p className="text-xs text-zinc-400">
            Accounts with public email providers (such as Gmail, Yahoo, or Outlook) cannot access PyqVitAp. Please switch to your university account.
          </p>

          <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row">
            {hasClerk ? (
              <ClerkSwitchAccountButton />
            ) : (
              <Link
                href="/sign-in"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-600/30 transition hover:bg-purple-700 active:scale-[0.98]"
              >
                <LogOut className="h-4 w-4" />
                Sign In
              </Link>
            )}

            <Link
              href="/"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/60 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Return Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
