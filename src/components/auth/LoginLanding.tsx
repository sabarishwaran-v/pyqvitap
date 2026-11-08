"use client";

import React, { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { SignIn, SignUp } from "@clerk/nextjs";
import {
  GraduationCap,
  ShieldCheck,
  Sparkles,
  BookOpen,
  Mail,
  AlertCircle,
  CheckCircle2,
  LogIn,
  UserPlus,
} from "lucide-react";
import { pyqvitapClerkAppearance } from "@/config/clerk-theme";
import {
  sanitizeRedirectUrl,
  ALLOWED_EMAIL_DOMAINS,
  getEmailValidationError,
} from "@/config/auth";

interface LoginLandingProps {
  redirectUrl?: string;
}

type AuthMode = "signin" | "signup";

export default function LoginLanding({ redirectUrl }: LoginLandingProps) {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [emailInput, setEmailInput] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [, startTransition] = useTransition();

  const hasClerkKey = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const safeRedirect = sanitizeRedirectUrl(redirectUrl);

  const emailError = emailTouched ? getEmailValidationError(emailInput) : null;
  const isEmailValid = emailInput.trim().length > 0 && emailError === null;

  const handleModeSwitch = (newMode: AuthMode) => {
    startTransition(() => {
      setMode(newMode);
    });
  };

  return (
    <div className="relative min-h-[calc(100vh-140px)] w-full overflow-hidden bg-[#F3F5FF] text-zinc-900 transition-colors duration-300 dark:bg-[#070114] dark:text-zinc-100 flex items-center justify-center px-4 py-8 md:py-12">
      {/* Background ambient radial glow accents */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-purple-600/15 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-indigo-600/15 blur-[140px]" />

      <div className="relative z-10 mx-auto w-full max-w-6xl overflow-hidden rounded-3xl border border-zinc-200/80 bg-white/80 shadow-2xl backdrop-blur-xl dark:border-purple-500/20 dark:bg-[#0c061d]/85">
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
          {/* ======================================================== */}
          {/* LEFT PANEL: PyqVitAp Branding & Academic Mission         */}
          {/* ======================================================== */}
          <div className="flex flex-col justify-between border-b border-zinc-200/80 bg-gradient-to-br from-white/90 to-purple-50/40 p-8 dark:border-purple-500/20 dark:from-[#0f0926]/90 dark:to-[#070114]/90 lg:col-span-5 lg:border-b-0 lg:border-r lg:p-12 xl:p-14">
            <div className="space-y-6">
              {/* Brand Logo & Name */}
              <div className="flex items-center gap-3">
                <Image
                  src="/assets/images/navbar_logo.png?v=5"
                  alt="PyqVitAp Logo"
                  width={48}
                  height={48}
                  priority
                  className="h-11 w-11 rounded-2xl shadow-md transition-transform duration-200 hover:scale-105"
                />
                <span className="bg-gradient-to-r from-[#562EE7] to-[rgba(116,128,255,0.8)] bg-clip-text font-jost text-3xl font-extrabold tracking-wide text-transparent dark:from-[#562EE7] dark:to-[#FFC6E8]">
                  PyqVitAp
                </span>
              </div>

              {/* Tagline Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3.5 py-1 text-xs font-semibold text-purple-700 dark:text-purple-300">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Academic Resource Hub</span>
              </div>

              {/* Welcome Headlines */}
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                  Welcome to PyqVitAp
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300 sm:text-base">
                  Sign in with your university account to continue.
                </p>
                <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                  Built exclusively for students and faculty of VIT-AP University. Access thousands of previous-year CAT, FAT, and model question papers with verified solutions.
                </p>
              </div>

              {/* University Domain Restriction Card */}
              <div className="rounded-2xl border border-purple-500/25 bg-white/70 p-4 shadow-sm dark:border-purple-500/20 dark:bg-purple-950/30">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400" />
                  <div>
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-purple-800 dark:text-purple-300">
                      Authorized University Domains
                    </h2>
                    <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                      Only institutional accounts are permitted:
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 font-mono text-xs font-semibold">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-100/70 px-2.5 py-1 text-purple-900 dark:border-purple-500/30 dark:bg-purple-900/40 dark:text-purple-200">
                    <GraduationCap className="h-3.5 w-3.5" />
                    @vitapstudent.ac.in
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Footer Quote */}
            <div className="mt-8 border-t border-zinc-200/80 pt-6 dark:border-purple-500/20">
              <p className="font-play text-xs italic text-zinc-500 dark:text-purple-300/80">
                &ldquo;Your university. Your resources. Your preparation.&rdquo;
              </p>
              <div className="mt-3 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <div className="flex items-center gap-2">
                  <Link
                    href="/terms"
                    className="hover:text-purple-600 dark:hover:text-purple-300 underline underline-offset-2"
                  >
                    Terms
                  </Link>
                  <span>&bull;</span>
                  <Link
                    href="/privacy"
                    className="hover:text-purple-600 dark:hover:text-purple-300 underline underline-offset-2"
                  >
                    Privacy
                  </Link>
                  <span>&bull;</span>
                  <Link
                    href="/disclaimer"
                    className="hover:text-purple-600 dark:hover:text-purple-300 underline underline-offset-2"
                  >
                    Disclaimer
                  </Link>
                </div>
                <span>5,000+ Exam Papers</span>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* RIGHT PANEL: Interactive Authentication Card             */}
          {/* ======================================================== */}
          <div className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:col-span-7 lg:p-12 xl:p-14">
            <div className="mx-auto w-full max-w-md">
              {/* Animated Mode Switcher Tabs */}
              <div className="relative mb-6">
                <div
                  role="tablist"
                  aria-label="Authentication Mode"
                  className="relative flex rounded-2xl border border-zinc-200 bg-zinc-100/80 p-1.5 shadow-inner backdrop-blur-md dark:border-purple-500/30 dark:bg-[#181033]/90"
                >
                  {/* Sliding animated background pill */}
                  <div
                    className={`absolute top-1.5 bottom-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 shadow-md transition-all duration-300 ease-out motion-reduce:transition-none ${
                      mode === "signin"
                        ? "left-1.5 w-[calc(50%-6px)]"
                        : "left-[calc(50%+3px)] w-[calc(50%-6px)]"
                    }`}
                    aria-hidden="true"
                  />

                  {/* Sign In Tab Button */}
                  <button
                    type="button"
                    role="tab"
                    id="tab-signin"
                    aria-selected={mode === "signin"}
                    aria-controls="panel-signin"
                    onClick={() => handleModeSwitch("signin")}
                    className={`relative z-10 flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors duration-200 ${
                      mode === "signin"
                        ? "text-white"
                        : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                    }`}
                  >
                    <LogIn className="h-4 w-4" />
                    <span>Sign In</span>
                  </button>

                  {/* Sign Up Tab Button */}
                  <button
                    type="button"
                    role="tab"
                    id="tab-signup"
                    aria-selected={mode === "signup"}
                    aria-controls="panel-signup"
                    onClick={() => handleModeSwitch("signup")}
                    className={`relative z-10 flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors duration-200 ${
                      mode === "signup"
                        ? "text-white"
                        : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                    }`}
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Sign Up</span>
                  </button>
                </div>
              </div>

              {/* University Domain Validation Helper Banner */}
              <div className="mb-6 rounded-2xl border border-purple-500/20 bg-purple-50/50 p-4 transition-all duration-200 dark:border-purple-500/25 dark:bg-[#150d30]">
                <label
                  htmlFor="university-email-tester"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  Verify your university email domain before signing in:
                </label>
                <div className="relative mt-2">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="university-email-tester"
                    type="email"
                    value={emailInput}
                    onChange={(e) => {
                      setEmailInput(e.target.value);
                      if (!emailTouched) setEmailTouched(true);
                    }}
                    onBlur={() => setEmailTouched(true)}
                    placeholder="student@vitapstudent.ac.in"
                    autoComplete="email"
                    className={`w-full rounded-xl border bg-white py-2 pl-10 pr-10 text-xs text-zinc-900 shadow-sm outline-none transition focus:ring-2 dark:bg-[#1a113a] dark:text-white ${
                      emailError
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                        : isEmailValid
                        ? "border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/20"
                        : "border-purple-500/20 focus:border-purple-500 focus:ring-purple-500/20"
                    }`}
                  />
                  {emailInput && (
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      {isEmailValid ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  )}
                </div>

                {/* Inline Domain Validation Message */}
                {emailError && (
                  <div
                    role="alert"
                    className="mt-2.5 flex items-start gap-1.5 text-xs font-medium text-red-600 dark:text-red-400 transition-all duration-200"
                  >
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{emailError}</span>
                  </div>
                )}
                {isEmailValid && (
                  <div className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      Authorized university account ({emailInput.trim().split("@")[1]?.toLowerCase()}).
                    </span>
                  </div>
                )}
              </div>

              {/* Clerk Native Authentication Form with Smooth Slide/Fade Transition */}
              {hasClerkKey ? (
                <div className="relative min-h-[440px] w-full overflow-hidden">
                  {/* Mode: Sign In Panel */}
                  <div
                    id="panel-signin"
                    role="tabpanel"
                    aria-labelledby="tab-signin"
                    className={`w-full transition-all duration-300 ease-out motion-reduce:transition-none ${
                      mode === "signin"
                        ? "relative opacity-100 translate-x-0 pointer-events-auto"
                        : "absolute top-0 left-0 opacity-0 -translate-x-8 pointer-events-none"
                    }`}
                  >
                    <SignIn
                      appearance={pyqvitapClerkAppearance}
                      routing="virtual"
                      signUpUrl="#"
                      fallbackRedirectUrl={safeRedirect}
                      initialValues={{
                        emailAddress: isEmailValid ? emailInput.trim() : undefined,
                      }}
                    />
                    <div className="mt-4 text-center">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Don&apos;t have an account yet?{" "}
                        <button
                          type="button"
                          onClick={() => handleModeSwitch("signup")}
                          className="font-semibold text-purple-600 hover:text-purple-500 dark:text-purple-400 dark:hover:text-purple-300 underline underline-offset-2 transition"
                        >
                          Sign Up with university email
                        </button>
                      </p>
                    </div>
                  </div>

                  {/* Mode: Sign Up Panel */}
                  <div
                    id="panel-signup"
                    role="tabpanel"
                    aria-labelledby="tab-signup"
                    className={`w-full transition-all duration-300 ease-out motion-reduce:transition-none ${
                      mode === "signup"
                        ? "relative opacity-100 translate-x-0 pointer-events-auto"
                        : "absolute top-0 left-0 opacity-0 translate-x-8 pointer-events-none"
                    }`}
                  >
                    <SignUp
                      appearance={pyqvitapClerkAppearance}
                      routing="virtual"
                      signInUrl="#"
                      fallbackRedirectUrl={safeRedirect}
                      initialValues={{
                        emailAddress: isEmailValid ? emailInput.trim() : undefined,
                      }}
                    />
                    <div className="mt-4 text-center">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Already have an account?{" "}
                        <button
                          type="button"
                          onClick={() => handleModeSwitch("signin")}
                          className="font-semibold text-purple-600 hover:text-purple-500 dark:text-purple-400 dark:hover:text-purple-300 underline underline-offset-2 transition"
                        >
                          Sign in to existing account
                        </button>
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-purple-500/20 bg-purple-950/20 p-8 text-center text-zinc-300">
                  <h2 className="text-sm font-semibold text-white">Clerk Configuration Pending</h2>
                  <p className="mt-2 text-xs text-zinc-400">
                    Please configure <code className="text-purple-300">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> in your environment to display the authentication form.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
