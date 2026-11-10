import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthEnabled } from "@/config/auth";
import {
  Lock,
  EyeOff,
  UserCheck,
  ShieldCheck,
  Server,
  Trash2,
  Cookie,
  Mail,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy | PyqVitAp",
  description:
    "Privacy Policy for PyqVitAp — how we protect your institutional email, uphold student privacy, and adhere to DPDP Act 2023 data minimization principles.",
};

export default async function PrivacyPage() {
  const authEnabled = await isAuthEnabled();
  if (!authEnabled) {
    redirect("/terms");
  }
  return (
    <div className="min-h-screen bg-[#F3F5FF] px-4 py-12 text-black dark:bg-[#070114] dark:text-white sm:px-6 md:px-8 lg:py-16">
      <div className="mx-auto max-w-4xl space-y-10">
        {/* Page Header */}
        <div className="space-y-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#562EE7]/30 bg-[#562EE7]/10 px-4 py-1.5 text-xs font-semibold text-[#562EE7] dark:border-[#A47DE5]/40 dark:bg-[#A47DE5]/10 dark:text-[#A47DE5]">
            <Lock className="h-4 w-4" />
            <span>Student Privacy & Data Protection</span>
          </div>
          <h1 className="font-vipnabd text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
            Privacy Policy
          </h1>
          <p className="mx-auto max-w-2xl font-play text-sm text-gray-600 dark:text-gray-400 sm:text-base">
            PyqVitAp is built by students for students. We believe your privacy is fundamental. This policy outlines how your data is handled with strict minimization, zero commercialization, and full transparency.
          </p>
          <div className="font-play text-xs text-gray-500 dark:text-gray-400">
            Last Updated: November 2026 &bull; Compliant with Digital Personal Data Protection (DPDP) Act 2023 principles
          </div>
        </div>

        {/* Main Content Cards */}
        <div className="space-y-6">
          {/* Section 1: Privacy Commitment & Principles */}
          <section className="rounded-2xl border border-gray-200 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-[#3A3745] dark:bg-[#130E1F]/70 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-[#562EE7]/10 p-3 text-[#562EE7] dark:bg-[#A47DE5]/15 dark:text-[#A47DE5]">
                <ShieldCheck className="h-6 w-6 shrink-0" />
              </div>
              <div className="space-y-3">
                <h2 className="font-jost text-xl font-bold sm:text-2xl">
                  1. Our Privacy Philosophy & Data Protection Commitment
                </h2>
                <div className="space-y-2 font-play text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  <p>
                    At <strong>PyqVitAp</strong> (&ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;the platform&rdquo;), we recognize that students value their privacy and digital autonomy. Our platform operates as an open educational archive under four non-negotiable principles:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Open Access & Zero Account Obligation:</strong> Browsing, previewing, searching, and downloading past question papers require no registration, sign-in, or student credential submission.</li>
                    <li><strong>Zero Credential Harvesting:</strong> We do not collect, harvest, store, or sell student emails, passwords, or institutional accounts.</li>
                    <li><strong>Zero Monetization:</strong> We do not sell, rent, trade, or distribute user information to advertisers, coaching companies, or data aggregators.</li>
                    <li><strong>Full Control & Erasure:</strong> Users who subscribe voluntarily to newsletter updates can unsubscribe instantly at any time.</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: What Data We Collect */}
          <section className="rounded-2xl border border-gray-200 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-[#3A3745] dark:bg-[#130E1F]/70 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-[#562EE7]/10 p-3 text-[#562EE7] dark:bg-[#A47DE5]/15 dark:text-[#A47DE5]">
                <UserCheck className="h-6 w-6 shrink-0" />
              </div>
              <div className="space-y-3">
                <h2 className="font-jost text-xl font-bold sm:text-2xl">
                  2. What Data We Collect & Why
                </h2>
                <div className="space-y-2 font-play text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  <p>In our current Open Access operating mode, PyqVitAp processes minimal, non-invasive data:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <strong>No Mandatory Student Account Data:</strong> You do not need to sign in, create a profile, or share your university credentials to browse or download examination papers.
                    </li>
                    <li>
                      <strong>Voluntary Newsletter Subscription:</strong> If you voluntarily enter your email in the footer to receive exam pack updates, your email is stored solely to dispatch revision updates. It is never sold, shared, or used for commercial marketing.
                    </li>
                    <li>
                      <strong>Voluntary Paper Submissions:</strong> Uploaded PDF files and subject metadata submitted voluntarily to expand the student archive.
                    </li>
                    <li>
                      <strong>Security Rate-Limiting:</strong> Temporary IP counters to protect platform stability against automated denial-of-service floods.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: What We NEVER Collect */}
          <section className="rounded-2xl border border-gray-200 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-[#3A3745] dark:bg-[#130E1F]/70 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-red-500/10 p-3 text-red-600 dark:bg-red-500/20 dark:text-red-400">
                <EyeOff className="h-6 w-6 shrink-0" />
              </div>
              <div className="space-y-3">
                <h2 className="font-jost text-xl font-bold sm:text-2xl">
                  3. Information We Strictly NEVER Collect
                </h2>
                <div className="space-y-2 font-play text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  <p>To eliminate any ambiguity, PyqVitAp has never and will never collect:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>No Passwords:</strong> We use passwordless email OTP verification. We do not create, see, or store passwords.</li>
                    <li><strong>No Academic Records:</strong> We do not collect or have access to your CGPA, grades, course attendance, registration numbers, or exam marks.</li>
                    <li><strong>No Portal Access:</strong> We have zero connection to, or access into, your private VTOP student portal or university account.</li>
                    <li><strong>No Sensitive Personal Data:</strong> We do not collect phone numbers, government IDs, physical addresses, financial details, or payment card information.</li>
                    <li><strong>No Google Account Access:</strong> If you sign in via Google OAuth, we only receive your email address and verification status; we do not have access to your Google Drive, Gmail, or files.</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Zero Monetization & No Spam */}
          <section className="rounded-2xl border border-gray-200 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-[#3A3745] dark:bg-[#130E1F]/70 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-[#562EE7]/10 p-3 text-[#562EE7] dark:bg-[#A47DE5]/15 dark:text-[#A47DE5]">
                <Lock className="h-6 w-6 shrink-0" />
              </div>
              <div className="space-y-3">
                <h2 className="font-jost text-xl font-bold sm:text-2xl">
                  4. Zero-Monetization & Strict No-Spam Pledge
                </h2>
                <div className="space-y-2 font-play text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  <p>
                    <strong>We do not sell student data.</strong> PyqVitAp has never and will never sell, lease, trade, share, or license student email addresses or user data to third-party commercial entities, coaching centers, recruiters, or advertisement networks under any circumstance.
                  </p>
                  <p>
                    <strong>No Spam Policy:</strong> We do not send unsolicited marketing emails, advertisements, or third-party promotional material. Optional exam updates are only sent to users who explicitly subscribed via the footer, with one-click unsubscription in every message.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 5: Infrastructure & Third-Party Service Providers */}
          <section className="rounded-2xl border border-gray-200 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-[#3A3745] dark:bg-[#130E1F]/70 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-[#562EE7]/10 p-3 text-[#562EE7] dark:bg-[#A47DE5]/15 dark:text-[#A47DE5]">
                <Server className="h-6 w-6 shrink-0" />
              </div>
              <div className="space-y-3">
                <h2 className="font-jost text-xl font-bold sm:text-2xl">
                  5. Third-Party Infrastructure & Security Architecture
                </h2>
                <div className="space-y-2 font-play text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  <p>
                    To ensure industry-leading security without maintaining complex in-house servers, we rely on established, certified infrastructure providers:
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <strong>Cloudflare (Cloudflare, Inc.):</strong> Provides global CDN delivery, DNS routing, DDoS protection, edge SSL/TLS encryption, and automated bot mitigation to protect platform stability.
                    </li>
                    <li>
                      <strong>Cloudflare R2 & MongoDB:</strong> Used solely to host and index publicly shared past paper PDFs and metadata (course code, exam term).
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Section 6: Cookies & Local Storage */}
          <section className="rounded-2xl border border-gray-200 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-[#3A3745] dark:bg-[#130E1F]/70 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-[#562EE7]/10 p-3 text-[#562EE7] dark:bg-[#A47DE5]/15 dark:text-[#A47DE5]">
                <Cookie className="h-6 w-6 shrink-0" />
              </div>
              <div className="space-y-3">
                <h2 className="font-jost text-xl font-bold sm:text-2xl">
                  6. Cookies & Client-Side Storage
                </h2>
                <div className="space-y-2 font-play text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  <p>
                    PyqVitAp uses only <strong>strictly necessary</strong> cookies and local browser storage essential for functionality:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Session Cookies:</strong> Strictly necessary cookies to maintain browser connection state.</li>
                    <li><strong>Theme Preference:</strong> Stored locally in your browser (<code>theme: light / dark</code>) to remember your display choice.</li>
                    <li><strong>Pinned Subjects:</strong> Stored locally in your browser storage for your personal convenience so you can quickly jump to frequently accessed course codes.</li>
                  </ul>
                  <p>
                    We do <strong>not</strong> employ cross-site tracking cookies, advertising tracking pixels (such as Meta Pixel or Google Ads tracking), or third-party behavioral fingerprinting.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 7: User Rights & Right to Erasure */}
          <section className="rounded-2xl border border-gray-200 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-[#3A3745] dark:bg-[#130E1F]/70 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-[#562EE7]/10 p-3 text-[#562EE7] dark:bg-[#A47DE5]/15 dark:text-[#A47DE5]">
                <Trash2 className="h-6 w-6 shrink-0" />
              </div>
              <div className="space-y-3">
                <h2 className="font-jost text-xl font-bold sm:text-2xl">
                  7. Your Rights & Data Deletion (Right to be Forgotten)
                </h2>
                <div className="space-y-2 font-play text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  <p>
                    Under India&apos;s <strong>Digital Personal Data Protection (DPDP) Act 2023</strong> and internationally recognized privacy principles, you have complete sovereignty over your data:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Right to Review:</strong> You may inquire what records exist associated with your institutional email.</li>
                    <li><strong>Right to Permanent Erasure:</strong> You can at any time request the permanent deletion of your email address and profile from our authentication database.</li>
                  </ul>
                  <p>
                    To exercise your right to erasure, simply email us at <a href="mailto:pyqvitap@gmail.com" className="font-semibold text-[#562EE7] underline dark:text-[#A47DE5]">pyqvitap@gmail.com</a> with the subject &ldquo;Data Erasure Request&rdquo; from your institutional account. We will permanently purge your user records within 48 hours.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 8: Grievance Officer & Contact */}
          <section className="rounded-2xl border border-[#562EE7]/30 bg-gradient-to-br from-white/90 to-[#562EE7]/5 p-6 shadow-sm backdrop-blur-sm dark:border-[#A47DE5]/30 dark:bg-gradient-to-br dark:from-[#130E1F]/90 dark:to-[#562EE7]/10 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-[#562EE7] p-3 text-white dark:bg-[#A47DE5] dark:text-black">
                <Mail className="h-6 w-6 shrink-0" />
              </div>
              <div className="space-y-3">
                <h2 className="font-jost text-xl font-bold sm:text-2xl">
                  8. Grievance Officer & Contact Information
                </h2>
                <div className="space-y-2 font-play text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  <p>
                    If you have any questions, feedback, security concerns, or requests regarding this Privacy Policy or data processing on PyqVitAp, please contact our student maintainer and privacy lead:
                  </p>
                  <div className="space-y-1 pt-1 font-play text-sm text-gray-800 dark:text-gray-200">
                    <p><strong>Platform:</strong> PyqVitAp (Independent Academic Resource Project)</p>
                    <p><strong>Maintainer:</strong> Sabarish V</p>
                    <p><strong>Dedicated Privacy Inbox:</strong> <a href="mailto:pyqvitap@gmail.com" className="text-[#562EE7] underline dark:text-[#A47DE5]">pyqvitap@gmail.com</a></p>
                  </div>
                  <div className="pt-2">
                    <a
                      href="mailto:pyqvitap@gmail.com"
                      className="inline-flex items-center gap-2 rounded-lg bg-[#562EE7] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4531b3] dark:bg-[#A47DE5] dark:text-black dark:hover:bg-[#8e65d4]"
                    >
                      <Mail className="h-4 w-4" />
                      <span>Contact pyqvitap@gmail.com</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Navigation Bar */}
        <div className="flex flex-wrap items-center justify-center gap-4 border-t border-gray-200 pt-6 dark:border-[#3A3745] sm:gap-6">
          <Link
            href="/"
            className="font-play text-sm font-semibold text-[#562EE7] underline underline-offset-4 transition-colors hover:text-[#4531b3] dark:text-[#A47DE5] dark:hover:text-[#FFC6E8]"
          >
            &larr; Back to Home
          </Link>
          <span className="text-gray-400 dark:text-gray-600">&bull;</span>
          <Link
            href="/terms"
            className="font-play text-sm font-semibold text-[#562EE7] underline underline-offset-4 transition-colors hover:text-[#4531b3] dark:text-[#A47DE5] dark:hover:text-[#FFC6E8]"
          >
            Terms of Service
          </Link>
          <span className="text-gray-400 dark:text-gray-600">&bull;</span>
          <Link
            href="/disclaimer"
            className="font-play text-sm font-semibold text-[#562EE7] underline underline-offset-4 transition-colors hover:text-[#4531b3] dark:text-[#A47DE5] dark:hover:text-[#FFC6E8]"
          >
            Disclaimer & Rights
          </Link>
        </div>
      </div>
    </div>
  );
}
