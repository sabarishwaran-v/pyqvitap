"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { SignIn, SignUp } from "@clerk/nextjs";
import { getPyqvitapClerkAppearance } from "@/config/clerk-theme";
import { useTheme } from "next-themes";
import { Card } from "@/components/ui/card";
import {
  ALLOWED_EMAIL_DOMAINS,
  isAuthorizedEmail,
  sanitizeRedirectUrl,
} from "@/config/auth";
import { AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function HomepageSignInCard() {
  const { resolvedTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Mode state: 'sign-in' or 'sign-up'
  const [mode, setMode] = useState<"sign-in" | "sign-up">(() => {
    if (typeof window !== "undefined") {
      try {
        const params = new URLSearchParams(window.location.search);
        if (params.get("mode") === "sign-up" || window.location.hash.includes("sign-up")) {
          return "sign-up";
        }
      } catch {
        // Fall back safely
      }
    }
    return "sign-in";
  });

  // Track the email typed by the user
  const [typedEmail, setTypedEmail] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const params = new URLSearchParams(window.location.search);
        return params.get("email_address") || "";
      } catch {
        return "";
      }
    }
    return "";
  });

  // UX Improvement: Account not found state & domain validation errors
  const [isAccountNotFound, setIsAccountNotFound] = useState(false);
  const [domainError, setDomainError] = useState<string | null>(null);

  // Stable refs for real-time DOM interception & synchronization
  const isAccountNotFoundRef = useRef(false);
  const typedEmailRef = useRef(typedEmail);
  const clerkContainerRef = useRef<HTMLDivElement>(null);
  const hasShownOtpToastRef = useRef(false);

  // Keep ref in sync
  useEffect(() => {
    typedEmailRef.current = typedEmail;
  }, [typedEmail]);

  // Initialize destination safely from window.location.search if present on client,
  // falling back to default "/"
  const [destination, setDestination] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const params = new URLSearchParams(window.location.search);
        const qRedirect = params.get("redirect_url");
        if (qRedirect) {
          return sanitizeRedirectUrl(qRedirect, window.location.origin);
        }
      } catch {
        // Fall back safely
      }
    }
    return "/";
  });

  useEffect(() => {
    setMounted(true);

    const syncFromUrl = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const qRedirect = params.get("redirect_url");
        if (qRedirect) {
          setDestination(sanitizeRedirectUrl(qRedirect, window.location.origin));
        }
        const emailFromParam = params.get("email_address");
        if (emailFromParam) {
          setTypedEmail(emailFromParam);
          typedEmailRef.current = emailFromParam;
        }
        if (params.get("mode") === "sign-up" || window.location.hash.includes("sign-up")) {
          setMode("sign-up");
        } else {
          setMode("sign-in");
        }
      } catch {
        // Fall back safely
      }
    };

    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    window.addEventListener("hashchange", syncFromUrl);
    return () => {
      window.removeEventListener("popstate", syncFromUrl);
      window.removeEventListener("hashchange", syncFromUrl);
    };
  }, []);

  // During SSR or pre-mount, default to dark theme matching defaultTheme="dark"
  const isDark = mounted ? (resolvedTheme || theme) === "dark" : true;

  const appearance = React.useMemo(
    () =>
      getPyqvitapClerkAppearance(isDark, {
        hideSignUpLink: false,
        isHomepageCard: true,
      }),
    [isDark]
  );

  const hasCustomDestination = destination && destination !== "/";

  const signUpUrl = hasCustomDestination
    ? `/?mode=sign-up&redirect_url=${encodeURIComponent(destination)}`
    : "/?mode=sign-up";

  const signInUrl = hasCustomDestination
    ? `/?redirect_url=${encodeURIComponent(destination)}`
    : "/";

  // Helper to safely manipulate Clerk's primary submit button text
  const setSubmitButtonText = useCallback((text: string) => {
    const btn = clerkContainerRef.current?.querySelector(".cl-formButtonPrimary");
    if (!btn) return;
    const span = btn.querySelector("span");
    const target = span || btn;
    if (target.textContent !== text) {
      target.textContent = text;
    }
  }, []);

  // Watch for Clerk's "Couldn't find your account" error in the DOM
  useEffect(() => {
    if (mode !== "sign-in") return;

    const container = clerkContainerRef.current;
    if (!container) return;

    let isInternalMutation = false;
    let timeoutId: NodeJS.Timeout | null = null;

    const updateFromClerkError = () => {
      if (isInternalMutation) return;

      const errorEl = container.querySelector(
        ".cl-formFieldErrorText, .cl-alertText, .cl-formFieldError, [data-localization-key*='form_identifier_not_found']"
      );

      const errorText = errorEl?.textContent || "";
      const isNotFound =
        errorText.toLowerCase().includes("couldn't find your account") ||
        errorText.toLowerCase().includes("could not find an account") ||
        errorText.toLowerCase().includes("sign-up by continuing");

      if (isNotFound) {
        // Capture whatever is in the input field
        const input = container.querySelector(
          'input[name="identifier"], input[type="email"], input[type="text"]'
        ) as HTMLInputElement | null;
        const currentVal = input?.value.trim() || typedEmailRef.current;
        if (currentVal && typedEmailRef.current !== currentVal) {
          typedEmailRef.current = currentVal;
          setTypedEmail(currentVal);
        }

        if (!isAccountNotFoundRef.current) {
          isAccountNotFoundRef.current = true;
          setIsAccountNotFound(true);
        }

        // Change button to "Continue sign-up with this email" safely without looping
        isInternalMutation = true;
        try {
          setSubmitButtonText("Continue sign-up with this email");
        } finally {
          setTimeout(() => {
            isInternalMutation = false;
          }, 50);
        }
      }
    };

    updateFromClerkError();

    const observer = new MutationObserver(() => {
      if (isInternalMutation) return;
      if (timeoutId) return;
      timeoutId = setTimeout(() => {
        timeoutId = null;
        updateFromClerkError();
      }, 60);
    });

    observer.observe(container, { childList: true, subtree: true, characterData: true });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [mode, setSubmitButtonText]);

  // Autofill email into Clerk's Sign-Up input if transitioning from Sign-In
  useEffect(() => {
    if (mode === "sign-up" && typedEmailRef.current) {
      const timer = setTimeout(() => {
        const input = clerkContainerRef.current?.querySelector(
          'input[name="emailAddress"], input[name="identifier"], input[type="email"]'
        ) as HTMLInputElement | null;
        if (input && !input.value) {
          input.value = typedEmailRef.current;
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [mode]);

  // Real-time observer to inform users as soon as an OTP verification code is generated
  useEffect(() => {
    const container = clerkContainerRef.current;
    if (!container) return;

    const checkOtpScreen = () => {
      // 1. Check for presence of OTP digit boxes or code input fields
      const hasOtpInput = Boolean(
        container.querySelector(
          '.cl-otpCodeField, .cl-otpCodeFieldInput, input[autocomplete="one-time-code"], input[name="code"], [data-otp-input], [data-localization-key*="otp"], [data-localization-key*="verification_code"]'
        )
      );

      // 2. Check for text indicators
      const text = container.textContent?.toLowerCase() || "";
      const hasOtpText =
        text.includes("verification code") ||
        text.includes("verify your email") ||
        text.includes("check your email") ||
        text.includes("enter verification code") ||
        text.includes("enter the code") ||
        text.includes("enter the 6-digit code") ||
        text.includes("code has been sent");

      // 3. Check if standard email input is currently absent
      const hasEmailInput = Boolean(
        container.querySelector(
          'input[name="identifier"], input[name="emailAddress"], input[type="email"]'
        )
      );

      const isOtpScreen = hasOtpInput || (hasOtpText && !hasEmailInput);

      if (isOtpScreen) {
        if (!hasShownOtpToastRef.current) {
          hasShownOtpToastRef.current = true;
          toast.success(
            "Your verification code has been sent to your email. Please check your spam/junk folder also.",
            {
              id: "otp-sent-toast",
              duration: 6000,
            }
          );
        }
      } else if (hasEmailInput) {
        // Reset state so subsequent OTP generation triggers the toast again
        hasShownOtpToastRef.current = false;
      }
    };

    checkOtpScreen();

    let otpTimeoutId: NodeJS.Timeout | null = null;
    const observer = new MutationObserver(() => {
      if (otpTimeoutId) return;
      otpTimeoutId = setTimeout(() => {
        otpTimeoutId = null;
        checkOtpScreen();
      }, 100);
    });

    observer.observe(container, { childList: true, subtree: true });

    return () => {
      if (otpTimeoutId) clearTimeout(otpTimeoutId);
      observer.disconnect();
    };
  }, [mode]);

  // Intercept clicks on the primary button when in "Continue sign-up with this email" state
  const handleCardClickCapture = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      const submitBtn = target.closest(".cl-formButtonPrimary");

      if (submitBtn && isAccountNotFoundRef.current && mode === "sign-in") {
        e.preventDefault();
        e.stopPropagation();

        isAccountNotFoundRef.current = false;
        setIsAccountNotFound(false);
        setDomainError(null);

        const emailToTransfer = typedEmailRef.current;
        const targetSignUpUrl = hasCustomDestination
          ? `/?mode=sign-up&email_address=${encodeURIComponent(emailToTransfer)}&redirect_url=${encodeURIComponent(destination)}`
          : `/?mode=sign-up&email_address=${encodeURIComponent(emailToTransfer)}`;

        setMode("sign-up");
        window.history.pushState({}, "", targetSignUpUrl);
        return;
      }

      // Check for Resend code action to inform user that a fresh OTP was sent
      const resendTarget = target.closest(
        '.cl-resendCodeButton, [data-localization-key*="resend"], button, a'
      );
      if (resendTarget) {
        const text = resendTarget.textContent?.toLowerCase() || "";
        if (
          text.includes("resend") ||
          text.includes("send again") ||
          text.includes("didn't receive a code")
        ) {
          setTimeout(() => {
            toast.success(
              "A new verification code has been sent to your email. Please check your spam/junk folder also.",
              {
                id: "otp-sent-toast",
                duration: 6000,
              }
            );
          }, 400);
        }
      }
    },
    [mode, hasCustomDestination, destination]
  );

  // Seamless client-side interceptor for Clerk's prebuilt footer action links
  const handleCardClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const link = (e.target as HTMLElement).closest("a");
      if (!link) return;

      if (link.classList.contains("cl-footerActionLink") || link.closest(".cl-footerAction")) {
        const href = link.getAttribute("href");
        if (href) {
          try {
            const url = new URL(href, window.location.origin);
            const targetMode =
              url.searchParams.get("mode") ||
              (url.pathname.includes("sign-up") || href.includes("sign-up") ? "sign-up" : "sign-in");

            e.preventDefault();
            if (targetMode === "sign-up") {
              setMode("sign-up");
              const targetUrl = typedEmailRef.current
                ? `${signUpUrl}&email_address=${encodeURIComponent(typedEmailRef.current)}`
                : signUpUrl;
              window.history.pushState({}, "", targetUrl);
            } else {
              setMode("sign-in");
              window.history.pushState({}, "", signInUrl);
            }
          } catch {
            // Fall back gracefully
          }
        }
      }
    },
    [signUpUrl, signInUrl]
  );

  // Real-time input listener:
  // 1. Resets button & error if user edits/deletes any character
  // 2. Performs immediate client-side domain validation before sending request to Clerk
  const handleInputCapture = useCallback(
    (e: React.FormEvent<HTMLDivElement>) => {
      const target = e.target as HTMLInputElement;
      if (!target || (!target.name && !target.type)) return;

      const isEmailInput =
        target.name === "identifier" ||
        target.name === "emailAddress" ||
        target.type === "email" ||
        target.type === "text";

      if (!isEmailInput) return;

      const val = target.value.trim();
      setTypedEmail(val);
      typedEmailRef.current = val;

      // 1. If currently showing "Continue sign-up with this email" and user modifies/deletes:
      if (isAccountNotFoundRef.current) {
        isAccountNotFoundRef.current = false;
        setIsAccountNotFound(false);
        setSubmitButtonText("Continue");

        // Hide Clerk's error element so it doesn't stay visible
        const errorEls = clerkContainerRef.current?.querySelectorAll(
          ".cl-formFieldErrorText, .cl-alertText, .cl-formFieldError"
        );
        errorEls?.forEach((el) => {
          (el as HTMLElement).style.display = "none";
        });
      }

      // 2. Real-time Domain Validation:
      // Intelligently check if what the student is currently typing matches or is on its way
      // to becoming a valid VIT-AP domain (e.g. "vitap", "vitap.", "vitap.ac", "vitapstudent..."):
      if (val.includes("@")) {
        const atIndex = val.lastIndexOf("@");
        const domain = val.slice(atIndex + 1).toLowerCase();

        // Check if the typed domain is a valid prefix of any allowed domain
        const isPrefixOfAllowed = (ALLOWED_EMAIL_DOMAINS as readonly string[]).some(
          (allowed) => allowed.startsWith(domain)
        );

        if (isPrefixOfAllowed) {
          // The student is actively typing a legitimate VIT-AP email!
          // NEVER show an error while they are typing the domain, dots, or sub-parts.
          setDomainError(null);
        } else {
          // The typed domain cannot possibly become @vitapstudent.ac.in or @vitap.ac.in
          // (e.g. "@gmail.com", "@yahoo.com", "@outlook.com")
          // Only show error once they fully complete an unrecognized domain with a TLD
          const isCompleteDomain =
            domain.includes(".") && (domain.split(".").pop()?.length ?? 0) >= 2;
          if (isCompleteDomain) {
            setDomainError(
              "Please use your official VIT-AP email (@vitapstudent.ac.in or @vitap.ac.in)"
            );
          } else {
            setDomainError(null);
          }
        }
      } else {
        setDomainError(null);
      }
    },
    [setSubmitButtonText]
  );

  // Form submission interceptor:
  // Strictly rejects unauthorized domains and handles Enter key in account-not-found state
  const handleSubmitCapture = useCallback(
    (e: React.FormEvent<HTMLDivElement>) => {
      const input = clerkContainerRef.current?.querySelector(
        'input[name="identifier"], input[name="emailAddress"], input[type="email"], input[type="text"]'
      ) as HTMLInputElement | null;
      const currentEmail = (input?.value || typedEmailRef.current).trim();

      // If currently in account-not-found state and user hits Enter:
      if (isAccountNotFoundRef.current && mode === "sign-in") {
        e.preventDefault();
        e.stopPropagation();

        isAccountNotFoundRef.current = false;
        setIsAccountNotFound(false);
        setDomainError(null);

        const targetSignUpUrl = hasCustomDestination
          ? `/?mode=sign-up&email_address=${encodeURIComponent(currentEmail)}&redirect_url=${encodeURIComponent(destination)}`
          : `/?mode=sign-up&email_address=${encodeURIComponent(currentEmail)}`;

        setMode("sign-up");
        window.history.pushState({}, "", targetSignUpUrl);
        return;
      }

      // Strict Domain Validation check before sending request to Clerk:
      if (!isAuthorizedEmail(currentEmail)) {
        e.preventDefault();
        e.stopPropagation();
        setDomainError(
          "Please use your official VIT-AP email (@vitapstudent.ac.in or @vitap.ac.in)"
        );
        return;
      }

      setDomainError(null);
    },
    [mode, hasCustomDestination, destination]
  );

  const isSignUp = mode === "sign-up";

  return (
    <div className="mx-auto my-6 flex w-full flex-col items-center justify-center px-4 sm:px-6">
      {/* Outer Card: ~480-500px wide on desktop, subtle visible border, theme tokens, rounded-xl */}
      <Card
        onClickCapture={handleCardClickCapture}
        onClick={handleCardClick}
        onInputCapture={handleInputCapture}
        onSubmitCapture={handleSubmitCapture}
        className="cl-card-homepage w-full max-w-[480px] sm:max-w-[500px] rounded-xl border border-[#94A3B8]/60 bg-[#F7F8FD] p-6 shadow-[0_10px_30px_-5px_rgba(124,58,237,0.12),0_4px_6px_-2px_rgba(124,58,237,0.04)] dark:border-white/20 dark:bg-[#030712] dark:shadow-[0_20px_35px_-5px_rgba(0,0,0,0.7),0_0_25px_-5px_rgba(124,58,237,0.18)] sm:p-8"
      >
        {/* Inside the card: PyqVitAp Logo, Brand Name, and Heading */}
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-3">
            <Image
              src="/assets/images/navbar_logo.png?v=5"
              alt="PyqVitAp Logo"
              width={38}
              height={38}
              className="h-9 w-9 rounded-xl shadow-md transition-transform hover:scale-105 md:h-10 md:w-10"
            />
            <span className="bg-gradient-to-r from-[#562EE7] to-[rgba(116,128,255,0.8)] bg-clip-text font-jost text-3xl font-bold tracking-wide text-transparent dark:from-[#562EE7] dark:to-[#FFC6E8] md:text-4xl">
              PyqVitAp
            </span>
          </div>

          <h2 className="mt-4 text-2xl font-bold tracking-tight text-[#030712] dark:text-[#F9FAFB] md:text-3xl">
            {isSignUp ? "Create your account" : "Welcome Back"}
          </h2>

          <p className="mt-1.5 text-xs font-medium text-[#64748B] dark:text-[#9CA3AF] md:text-sm">
            {isSignUp
              ? "Sign up with your VIT-AP email to access previous papers."
              : "Sign in with your VIT-AP email to access previous papers."}
          </p>
        </div>

        {/* Real-time Domain Validation Error Notice */}
        {domainError && (
          <div
            role="alert"
            className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-xs font-semibold text-red-500 dark:text-red-400 transition-all animate-in fade-in slide-in-from-top-1"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{domainError}</span>
          </div>
        )}

        {/* Account Not Found helper banner */}
        {isAccountNotFound && mode === "sign-in" && (
          <div className="mt-4 flex flex-col gap-2 rounded-xl border border-[#562EE7]/40 bg-[#562EE7]/10 p-3.5 text-xs text-gray-900 dark:text-gray-100 transition-all animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-2 font-semibold text-[#562EE7] dark:text-[#A78BFA]">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>No account found with this email</span>
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              Would you like to create a new PyqVitAp account with <strong>{typedEmail || typedEmailRef.current}</strong>?
            </p>
            <button
              type="button"
              onClick={() => {
                isAccountNotFoundRef.current = false;
                setIsAccountNotFound(false);
                setDomainError(null);
                const emailToTransfer = typedEmail || typedEmailRef.current;
                const targetSignUpUrl = hasCustomDestination
                  ? `/?mode=sign-up&email_address=${encodeURIComponent(emailToTransfer)}&redirect_url=${encodeURIComponent(destination)}`
                  : `/?mode=sign-up&email_address=${encodeURIComponent(emailToTransfer)}`;
                setMode("sign-up");
                window.history.pushState({}, "", targetSignUpUrl);
              }}
              className="mt-1 w-full rounded-lg bg-gradient-to-r from-[#562EE7] to-[#7480FF] py-2 px-3 text-center text-xs font-semibold text-white shadow transition hover:opacity-90 active:scale-95 cursor-pointer"
            >
              Continue to sign up
            </button>
          </div>
        )}

        {/* Embedded Clerk Form */}
        <div ref={clerkContainerRef} className="mt-6 w-full">
          {isSignUp ? (
            <SignUp
              appearance={appearance}
              routing="hash"
              signInUrl={signInUrl}
              fallbackRedirectUrl="/"
              signInFallbackRedirectUrl="/"
              forceRedirectUrl={hasCustomDestination ? destination : undefined}
              signInForceRedirectUrl={hasCustomDestination ? destination : undefined}
            />
          ) : (
            <SignIn
              appearance={appearance}
              routing="hash"
              signUpUrl={signUpUrl}
              fallbackRedirectUrl="/"
              signUpFallbackRedirectUrl="/"
              forceRedirectUrl={hasCustomDestination ? destination : undefined}
              signUpForceRedirectUrl={hasCustomDestination ? destination : undefined}
            />
          )}
        </div>
      </Card>
    </div>
  );
}
