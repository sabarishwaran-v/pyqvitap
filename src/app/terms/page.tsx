import type { Metadata } from "next";
import Link from "next/link";
import {
  Scale,
  ShieldAlert,
  BookOpen,
  FileCheck,
  AlertTriangle,
  Ban,
  Mail,
  ShieldCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service | PyqVitAp",
  description:
    "Terms of Service, non-affiliation notice, academic fair use principles, and platform guidelines for PyqVitAp — an independent student archive.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#F3F5FF] px-4 py-12 text-black dark:bg-[#070114] dark:text-white sm:px-6 md:px-8 lg:py-16">
      <div className="mx-auto max-w-4xl space-y-10">
        {/* Page Header */}
        <div className="space-y-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#562EE7]/30 bg-[#562EE7]/10 px-4 py-1.5 text-xs font-semibold text-[#562EE7] dark:border-[#A47DE5]/40 dark:bg-[#A47DE5]/10 dark:text-[#A47DE5]">
            <Scale className="h-4 w-4" />
            <span>Platform Agreement & Guidelines</span>
          </div>
          <h1 className="font-vipnabd text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
            Terms of Service
          </h1>
          <p className="mx-auto max-w-2xl font-play text-sm text-gray-600 dark:text-gray-400 sm:text-base">
            Please read these Terms of Service carefully before accessing or using PyqVitAp. By accessing this platform, you agree to abide by these terms, intended to protect students, contributors, and the integrity of academic study.
          </p>
          <div className="font-play text-xs text-gray-500 dark:text-gray-400">
            Last Updated: November 2026 &bull; Effective for all PyqVitAp visitors and members
          </div>
        </div>

        {/* Main Content Cards */}
        <div className="space-y-6">
          {/* Section 1: Acceptance & Eligibility */}
          <section className="rounded-2xl border border-gray-200 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-[#3A3745] dark:bg-[#130E1F]/70 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-[#562EE7]/10 p-3 text-[#562EE7] dark:bg-[#A47DE5]/15 dark:text-[#A47DE5]">
                <ShieldCheck className="h-6 w-6 shrink-0" />
              </div>
              <div className="space-y-3">
                <h2 className="font-jost text-xl font-bold sm:text-2xl">
                  1. Acceptance of Terms & Eligibility
                </h2>
                <div className="space-y-2 font-play text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  <p>
                    By visiting, signing in, browsing, or utilizing any feature of <strong>PyqVitAp</strong> (&ldquo;the platform&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;), you acknowledge that you have read, understood, and agreed to be bound by these Terms of Service and our accompanying <Link href="/privacy" className="text-[#562EE7] underline dark:text-[#A47DE5]">Privacy Policy</Link> and <Link href="/disclaimer" className="text-[#562EE7] underline dark:text-[#A47DE5]">Disclaimer</Link>.
                  </p>
                  <p>
                    <strong>Institutional Access Restriction:</strong> Access to protected academic archives, question paper downloads, and collaborative features on PyqVitAp is strictly restricted to active students, researchers, faculty, and academic staff associated with VIT-AP University. Eligible users must authenticate using an authorized institutional email domain (<code>@vitapstudent.ac.in</code> or <code>@vitap.ac.in</code>).
                  </p>
                  <p>
                    If you do not agree to these terms or do not meet institutional eligibility, you must immediately discontinue your use of the platform.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Complete Disclaimer of Institutional Affiliation */}
          <section className="rounded-2xl border border-gray-200 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-[#3A3745] dark:bg-[#130E1F]/70 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-[#562EE7]/10 p-3 text-[#562EE7] dark:bg-[#A47DE5]/15 dark:text-[#A47DE5]">
                <ShieldAlert className="h-6 w-6 shrink-0" />
              </div>
              <div className="space-y-3">
                <h2 className="font-jost text-xl font-bold sm:text-2xl">
                  2. Independent Student Platform & Disclaimer of Institutional Affiliation
                </h2>
                <div className="space-y-2 font-play text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  <p>
                    <strong>PyqVitAp is an independent student-led peer project</strong> created solely by individual students to help fellow university peers prepare effectively for term examinations.
                  </p>
                  <p>
                    <strong>Strict Non-Affiliation:</strong> PyqVitAp is <strong>not affiliated with, authorized by, endorsed by, sponsored by, or operated by VIT-AP University</strong>, the Vellore Institute of Technology group, or any of their affiliated academic schools, administrative offices, controller of examinations, or departments.
                  </p>
                  <p>
                    Any course titles, abbreviations, course codes (such as &ldquo;CSE&rdquo;, &ldquo;ECE&rdquo;, &ldquo;MAT&rdquo;), or slot designations referenced on this website are used strictly for informational identification and cataloging purposes under nominative fair use.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Non-Commercial & Educational Fair Use */}
          <section className="rounded-2xl border border-gray-200 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-[#3A3745] dark:bg-[#130E1F]/70 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-[#562EE7]/10 p-3 text-[#562EE7] dark:bg-[#A47DE5]/15 dark:text-[#A47DE5]">
                <BookOpen className="h-6 w-6 shrink-0" />
              </div>
              <div className="space-y-3">
                <h2 className="font-jost text-xl font-bold sm:text-2xl">
                  3. Non-Commercial Academic Nature & Fair Use
                </h2>
                <div className="space-y-2 font-play text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  <p>
                    PyqVitAp is maintained on a completely non-profit, non-commercial basis as a public interest revision archive. We charge no subscription fees, require no payments, and do not offer any commercial services.
                  </p>
                  <p>
                    All materials on this website are provided strictly for <strong>personal, non-commercial educational study, research, and revision</strong>. Users may not resell, license, redistribute in bulk, or exploit any content downloaded from this archive for commercial purposes or monetization.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Content Sourcing & User Contributions */}
          <section className="rounded-2xl border border-gray-200 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-[#3A3745] dark:bg-[#130E1F]/70 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-[#562EE7]/10 p-3 text-[#562EE7] dark:bg-[#A47DE5]/15 dark:text-[#A47DE5]">
                <FileCheck className="h-6 w-6 shrink-0" />
              </div>
              <div className="space-y-3">
                <h2 className="font-jost text-xl font-bold sm:text-2xl">
                  4. Content Sourcing & User Contributions
                </h2>
                <div className="space-y-2 font-play text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  <p>
                    The question papers cataloged on PyqVitAp are assembled from publicly available institutional digital archives (such as DSpace) and voluntary submissions by university students who took those past examinations.
                  </p>
                  <p>
                    <strong>Contributor Responsibilities:</strong> When contributing or uploading question papers to PyqVitAp, you represent and warrant that:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>The paper represents a past, concluded examination, and in no event is an ongoing exam, upcoming paper, or confidential evaluation rubric.</li>
                    <li>The upload contains no malicious payloads, hidden metadata containing private student credentials, or offensive material.</li>
                    <li>You understand that all submissions are reviewed and moderated prior to publication to maintain repository hygiene.</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Section 5: Notice & Takedown Policy */}
          <section className="rounded-2xl border border-[#562EE7]/30 bg-gradient-to-br from-white/90 to-[#562EE7]/5 p-6 shadow-sm backdrop-blur-sm dark:border-[#A47DE5]/30 dark:bg-gradient-to-br dark:from-[#130E1F]/90 dark:to-[#562EE7]/10 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-[#562EE7] p-3 text-white dark:bg-[#A47DE5] dark:text-black">
                <Mail className="h-6 w-6 shrink-0" />
              </div>
              <div className="space-y-3">
                <h2 className="font-jost text-xl font-bold sm:text-2xl">
                  5. Institutional & Faculty Notice & Takedown Policy
                </h2>
                <div className="space-y-2 font-play text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  <p>
                    PyqVitAp holds the utmost respect for intellectual property rights, course instructors, and institutional academic policies. If you are a course instructor, faculty member, department head, or university administrative representative and you wish to have any specific question paper, document, or content modified or removed:
                  </p>
                  <p>
                    Please send a formal or informal request to our dedicated administrator mailbox at <a href="mailto:pyqvitap@gmail.com" className="font-semibold text-[#562EE7] underline dark:text-[#A47DE5]">pyqvitap@gmail.com</a> with the course code, term, and file link.
                  </p>
                  <p className="font-semibold text-[#562EE7] dark:text-[#A47DE5]">
                    Commitment: All valid takedown requests from course faculty or university officials are processed promptly within 24 to 48 hours without administrative friction.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 6: Prohibited Uses */}
          <section className="rounded-2xl border border-gray-200 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-[#3A3745] dark:bg-[#130E1F]/70 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-red-500/10 p-3 text-red-600 dark:bg-red-500/20 dark:text-red-400">
                <Ban className="h-6 w-6 shrink-0" />
              </div>
              <div className="space-y-3">
                <h2 className="font-jost text-xl font-bold sm:text-2xl">
                  6. Prohibited Activities & Security Rules
                </h2>
                <div className="space-y-2 font-play text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  <p>When using PyqVitAp, you strictly agree NOT to:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Use automated web crawlers, scrapers, bots, or extraction scripts to harvest the database or bypass rate limits without authorization.</li>
                    <li>Attempt to disrupt, overload, or flood the service via Denial of Service (DoS/DDoS) attacks or automated request loops.</li>
                    <li>Share OTP verification codes or attempt to bypass domain authentication checks using disposable or non-institutional email addresses.</li>
                    <li>Engage in any form of academic misconduct, cheating during live examinations, or distributing materials intended to compromise active assessments.</li>
                    <li>Reverse-engineer or exploit security vulnerabilities in the platform infrastructure.</li>
                  </ul>
                  <p>Violators may have their platform access revoked or blacklisted immediately.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 7: No Academic Warranty */}
          <section className="rounded-2xl border border-gray-200 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-[#3A3745] dark:bg-[#130E1F]/70 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-[#562EE7]/10 p-3 text-[#562EE7] dark:bg-[#A47DE5]/15 dark:text-[#A47DE5]">
                <AlertTriangle className="h-6 w-6 shrink-0" />
              </div>
              <div className="space-y-3">
                <h2 className="font-jost text-xl font-bold sm:text-2xl">
                  7. Disclaimer of Warranties & Academic Limitation of Liability
                </h2>
                <div className="space-y-2 font-play text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  <p>
                    <strong>&ldquo;As-Is&rdquo; Basis:</strong> All materials, papers, metadata, and tools provided on PyqVitAp are offered strictly on an &ldquo;as-is&rdquo; and &ldquo;as-available&rdquo; basis, without express or implied warranty of any kind.
                  </p>
                  <p>
                    <strong>No Academic Guarantee:</strong> Past examination papers reflect only prior assessments and historical test patterns. University syllabi, module weightages, question formats, and faculty evaluation criteria evolve constantly. PyqVitAp makes no representation that past questions will appear in future exams. Students remain individually responsible for verifying official syllabi on VTOP or directly with course instructors.
                  </p>
                  <p>
                    <strong>Liability Limitation:</strong> Under no circumstances shall PyqVitAp, its student developer, or contributors be held liable for any academic marks, grade determinations, exam outcomes, loss of data, or incidental academic consequences arising from the use or inability to use this platform.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 8: Changes & Contact */}
          <section className="rounded-2xl border border-gray-200 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-[#3A3745] dark:bg-[#130E1F]/70 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-[#562EE7]/10 p-3 text-[#562EE7] dark:bg-[#A47DE5]/15 dark:text-[#A47DE5]">
                <Scale className="h-6 w-6 shrink-0" />
              </div>
              <div className="space-y-3">
                <h2 className="font-jost text-xl font-bold sm:text-2xl">
                  8. Revisions to Terms & Contact Information
                </h2>
                <div className="space-y-2 font-play text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  <p>
                    We may update these Terms from time to time to reflect operational changes, community security measures, or legal requirements. Continued use of the platform following the posting of revised terms indicates your acceptance.
                  </p>
                  <p>
                    If you have questions, suggestions, or concerns regarding these Terms of Service, please reach out directly:
                  </p>
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
            href="/privacy"
            className="font-play text-sm font-semibold text-[#562EE7] underline underline-offset-4 transition-colors hover:text-[#4531b3] dark:text-[#A47DE5] dark:hover:text-[#FFC6E8]"
          >
            Privacy Policy
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
