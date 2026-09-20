import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldAlert,
  BookOpen,
  Scale,
  FileText,
  AlertCircle,
  RefreshCw,
  Mail,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Disclaimer & Rights | PyqVitAp",
  description:
    "Disclaimer, intellectual property notices, attribution, and contact information for PyqVitAp — an independent student-built platform for academic resource.",
};

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-[#F3F5FF] px-4 py-12 text-black dark:bg-[#070114] dark:text-white sm:px-6 md:px-8 lg:py-16">
      <div className="mx-auto max-w-4xl space-y-10">
        {/* Page Header */}
        <div className="space-y-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#562EE7]/30 bg-[#562EE7]/10 px-4 py-1.5 text-xs font-semibold text-[#562EE7] dark:border-[#A47DE5]/40 dark:bg-[#A47DE5]/10 dark:text-[#A47DE5]">
            <ShieldAlert className="h-4 w-4" />
            <span>Legal & Attribution Notice</span>
          </div>
          <h1 className="font-vipnabd text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
            Disclaimer & Rights
          </h1>
          <p className="mx-auto max-w-2xl font-play text-sm text-gray-600 dark:text-gray-400 sm:text-base">
            Please read this notice regarding the independent student nature of
            PyqVitAp, intellectual property attribution, content sourcing, and
            terms of resource access.
          </p>
        </div>

        {/* Main Content Cards */}
        <div className="space-y-6">
          {/* Section 1: Independent Project & No Affiliation */}
          <section className="rounded-2xl border border-gray-200 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-[#3A3745] dark:bg-[#130E1F]/70 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-[#562EE7]/10 p-3 text-[#562EE7] dark:bg-[#A47DE5]/15 dark:text-[#A47DE5]">
                <ShieldAlert className="h-6 w-6 shrink-0" />
              </div>
              <div className="space-y-3">
                <h2 className="font-jost text-xl font-bold sm:text-2xl">
                  1. Independent Student Project & No Institutional Affiliation
                </h2>
                <div className="space-y-2 font-play text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  <p>
                    <strong>PyqVitAp</strong> is an independent student-built platform for academic resources, maintained by an individual student for fellow students.
                  </p>
                  <p>
                    This website is <strong>not affiliated with, endorsed by, sponsored by, or operated by VIT-AP University</strong> or any of its constituent schools, departments, centres, or governing bodies.
                  </p>
                  <p>
                    VIT-AP University, its faculty, examination cells, and administration bear no responsibility for the creation, operation, maintenance, content accuracy, or availability of materials on this site.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Purpose */}
          <section className="rounded-2xl border border-gray-200 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-[#3A3745] dark:bg-[#130E1F]/70 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-[#562EE7]/10 p-3 text-[#562EE7] dark:bg-[#A47DE5]/15 dark:text-[#A47DE5]">
                <BookOpen className="h-6 w-6 shrink-0" />
              </div>
              <div className="space-y-3">
                <h2 className="font-jost text-xl font-bold sm:text-2xl">
                  2. Educational & Student-Help Purpose
                </h2>
                <div className="space-y-2 font-play text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  <p>
                    The sole purpose of PyqVitAp is to support student learning and examination preparation by providing convenient, organized access to past university question papers and related academic materials.
                  </p>
                  <p>
                    This platform operates as a non-commercial educational aid created to assist students in understanding exam patterns, practice question styles, and revision material.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Sourcing & Attribution */}
          <section className="rounded-2xl border border-gray-200 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-[#3A3745] dark:bg-[#130E1F]/70 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-[#562EE7]/10 p-3 text-[#562EE7] dark:bg-[#A47DE5]/15 dark:text-[#A47DE5]">
                <FileText className="h-6 w-6 shrink-0" />
              </div>
              <div className="space-y-3">
                <h2 className="font-jost text-xl font-bold sm:text-2xl">
                  3. Content Sourcing & Institutional Repositories
                </h2>
                <div className="space-y-2 font-play text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  <p>
                    Question papers and related academic documents accessible through PyqVitAp are primarily sourced from publicly accessible institutional resources, including the university&apos;s public <strong>DSpace</strong> digital repository, as well as voluntary student contributions.
                  </p>
                  <p>
                    PyqVitAp does not claim authorship, original formulation, or ownership of the question papers or course syllabi created by course instructors and university academic divisions.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Intellectual Property & Rights */}
          <section className="rounded-2xl border border-gray-200 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-[#3A3745] dark:bg-[#130E1F]/70 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-[#562EE7]/10 p-3 text-[#562EE7] dark:bg-[#A47DE5]/15 dark:text-[#A47DE5]">
                <Scale className="h-6 w-6 shrink-0" />
              </div>
              <div className="space-y-3">
                <h2 className="font-jost text-xl font-bold sm:text-2xl">
                  4. Intellectual Property & Copyright Notice
                </h2>
                <div className="space-y-2 font-play text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  <p>
                    All copyrights, trademarks, institutional names, course titles, course codes, and question paper contents remain the property of their respective owners, including VIT-AP University and individual course instructors.
                  </p>
                  <p>
                    Nothing on this website should be construed as claiming that examination papers are copyright-free or &ldquo;free to use&rdquo; beyond personal educational study. All rights to the underlying intellectual property remain with the original creators and respective rights holders.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 5: No Warranty / Accuracy */}
          <section className="rounded-2xl border border-gray-200 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-[#3A3745] dark:bg-[#130E1F]/70 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-[#562EE7]/10 p-3 text-[#562EE7] dark:bg-[#A47DE5]/15 dark:text-[#A47DE5]">
                <AlertCircle className="h-6 w-6 shrink-0" />
              </div>
              <div className="space-y-3">
                <h2 className="font-jost text-xl font-bold sm:text-2xl">
                  5. No Guarantee of Completeness or Accuracy
                </h2>
                <div className="space-y-2 font-play text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  <p>
                    While reasonable care is taken to index and organize papers correctly by subject code, slot, and exam term, PyqVitAp provides all resources on an <em>&ldquo;as-is&rdquo;</em> and <em>&ldquo;as-available&rdquo;</em> basis without warranty of any kind, express or implied.
                  </p>
                  <p>
                    Course syllabi, exam patterns, question formats, and module distributions change across semesters. Students are strongly advised to verify all current syllabus requirements, exam guidelines, and instructions directly with their respective course instructors and official academic bulletins.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 6: Content Availability */}
          <section className="rounded-2xl border border-gray-200 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-[#3A3745] dark:bg-[#130E1F]/70 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-[#562EE7]/10 p-3 text-[#562EE7] dark:bg-[#A47DE5]/15 dark:text-[#A47DE5]">
                <RefreshCw className="h-6 w-6 shrink-0" />
              </div>
              <div className="space-y-3">
                <h2 className="font-jost text-xl font-bold sm:text-2xl">
                  6. Content Availability & Modifications
                </h2>
                <div className="space-y-2 font-play text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  <p>
                    The availability of question papers, categories, and site features may change at any time without prior notice. Papers may be added, reorganized, or taken down as needed to maintain accuracy and address rights-holder requests.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 7: Copyright Inquiries & Takedown Process */}
          <section className="rounded-2xl border border-[#562EE7]/30 bg-gradient-to-br from-white/90 to-[#562EE7]/5 p-6 shadow-sm backdrop-blur-sm dark:border-[#A47DE5]/30 dark:bg-gradient-to-br dark:from-[#130E1F]/90 dark:to-[#562EE7]/10 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-[#562EE7] p-3 text-white dark:bg-[#A47DE5] dark:text-black">
                <Mail className="h-6 w-6 shrink-0" />
              </div>
              <div className="space-y-3">
                <h2 className="font-jost text-xl font-bold sm:text-2xl">
                  7. Copyright Inquiries, Takedowns & Contact Process
                </h2>
                <div className="space-y-2 font-play text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  <p>
                    PyqVitAp respects the intellectual property rights of institutions, faculty members, and content creators. If you are an authorized representative or copyright holder and wish to request the review, update, or removal of any document or content on this website, please reach out to us.
                  </p>
                  <p>
                    Please include the specific course code, course name, paper URL/link, and your details in your correspondence so that the request can be verified and addressed promptly.
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

        {/* Back to Home Link */}
        <div className="pt-4 text-center">
          <Link
            href="/"
            className="font-play text-sm font-semibold text-[#562EE7] underline underline-offset-4 transition-colors hover:text-[#4531b3] dark:text-[#A47DE5] dark:hover:text-[#FFC6E8]"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
