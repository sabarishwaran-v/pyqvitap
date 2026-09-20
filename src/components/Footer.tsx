"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "@/components/ui/input";
import { Mail, ExternalLink, Github } from "lucide-react";
import toast from "react-hot-toast";
import type { ApiResponse } from '@/interface'

export default function Footer() {
  const [email, setEmail] = useState("");
  const handleSubscribe = async () => {
    if (!email.trim()) {
      toast.error("Please enter your email.");
      return;
    }

    await toast.promise(
      fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })     
      .then(async (res) => {
        const data = (await res.json()) as ApiResponse<never>;
        if (!res.ok) throw new Error(data.message ?? "Something went wrong.");
        return data;
      }),
      {
        loading: "Subscribing...",
        success: "You've Successfully Subscribed!",
        error: (err: Error) => err.message || "Subscription Failed.",
      },
    );

    setEmail("");
  };

  return (
    <footer className="w-full overflow-hidden bg-gradient-to-b from-[#F3F5FF] to-[#A599CE] px-6 py-10 pt-16 md:pt-20 lg:pt-28 text-black dark:text-white dark:from-[#070114] dark:to-[#1F0234]">
      <div className="mx-auto flex max-w-7xl flex-col lg:flex-row justify-between gap-y-10 text-center lg:text-left mb-12">
        {/* Branding */}
        <div className="flex w-full flex-col gap-3 lg:w-[32%] items-center lg:items-start">
          <Link
            href="/"
            className="bg-gradient-to-r from-[#562EE7] to-[rgba(116,128,255,0.8)] bg-clip-text font-jost text-4xl sm:text-5xl font-bold tracking-wide text-transparent dark:to-[#FFC6E8]"
          >
            PyqVitAp
          </Link>
          <p className="font-play text-sm text-gray-700 dark:text-gray-300 max-w-sm">
            Independent student-built platform for academic resource.
          </p>
        </div>

        {/* Other Project: FFCS Mate */}
        <div className="flex w-full flex-col gap-3 lg:w-[32%] items-center lg:items-start">
          <h3 className="font-jost text-xl font-semibold text-black dark:text-white">
            My Other Project
          </h3>
          <a
            href="https://ffcsmate.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex w-full max-w-sm flex-col justify-between rounded-2xl border border-[#3A3745]/30 bg-white/40 p-4 backdrop-blur-sm transition-all duration-200 hover:border-[#562EE7] hover:bg-white/60 hover:shadow-md dark:border-[#3A3745] dark:bg-[#130E1F]/60 dark:hover:border-[#A47DE5] dark:hover:bg-[#1A1528]"
          >
            <div className="flex items-center justify-between">
              <span className="font-jost text-lg font-bold text-[#562EE7] dark:text-[#FFC6E8] group-hover:underline">
                FFCS Mate
              </span>
              <ExternalLink className="h-4 w-4 text-gray-500 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 dark:text-gray-400" />
            </div>
            <p className="mt-1.5 text-xs text-gray-600 dark:text-gray-300 text-left">
              FFCS TimeTable Planner
            </p>
          </a>
        </div>

        {/* Contact & Updates */}
        <div className="flex w-full flex-col gap-3 lg:w-[30%] items-center lg:items-start">
          <h3 className="font-jost text-xl font-semibold text-black dark:text-white">
            Contact & Updates
          </h3>
          <Link
            href="mailto:pyqvitap@gmail.com"
            className="flex items-center gap-2 font-jost text-base font-semibold text-black transition-colors hover:text-[#562EE7] dark:text-white dark:hover:text-[#FFC6E8]"
          >
            <Mail size={18} fontWeight="Bold" />
            <span>pyqvitap@gmail.com</span>
          </Link>

          <div className="mt-1 w-full max-w-sm">
            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                placeholder="Enter Your Email"
                className="flex-1 text-sm text-black dark:text-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button
                onClick={handleSubscribe}
                className="rounded-md bg-[#562EE7] px-4 text-white hover:bg-[#4531b3]"
              >
                Subscribe!
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Divider & Bottom Section */}
      <div className="border-t border-[#130E1F]/20 pt-8 dark:border-white/10">
        {/* Credit */}
        <p className="text-center font-play text-base font-medium text-black dark:text-white">
          Made with 💜 by{" "}
          <a
            href="https://github.com/sabarishwaran-v"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#562EE7] underline underline-offset-4 transition-colors hover:text-[#4531b3] dark:text-[#A47DE5] dark:hover:text-[#FFC6E8]"
          >
            Sabarish V
          </a>
        </p>

        {/* Open Source on GitHub */}
        <p className="mt-2.5 flex items-center justify-center gap-1.5 text-center font-play text-sm text-gray-800 dark:text-gray-200">
          <span>This project is Open Source on</span>
          <a
            href="https://github.com/sabarishwaran-v/pyqvitap"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-[#562EE7] underline underline-offset-4 transition-colors hover:text-[#4531b3] dark:text-[#A47DE5] dark:hover:text-[#FFC6E8]"
            title="View PyqVitAp on GitHub"
            aria-label="View PyqVitAp on GitHub"
          >
            <Github className="h-4 w-4" />
            <span>GitHub</span>
          </a>
        </p>

        {/* Independent Project / Legal Notice */}
        <div className="mx-auto mt-6 max-w-3xl space-y-3 px-4 text-center font-play text-xs leading-relaxed text-gray-700 dark:text-gray-400">
          <p>
            This is an independent website built by a student. It is not affiliated with, endorsed by, or operated by VIT-AP University.
          </p>
          <p>
            This website is created solely to help students by providing easy access to previous year question papers and related academic resources.
          </p>
          <p>
            VIT-AP University, its faculty, and administration are not responsible for the content, accuracy, or availability of the material on this site.
          </p>
          <p>
            Question papers and related content may originate from publicly accessible institutional resources, including VIT-AP DSpace. Rights to the underlying materials remain with their respective owners.
          </p>
        </div>

        {/* Dedicated Legal Page Link */}
        <div className="mt-4 pb-2 text-center">
          <Link
            href="/disclaimer"
            className="font-play text-xs font-semibold text-[#562EE7] underline underline-offset-4 transition-colors hover:text-[#4531b3] dark:text-[#A47DE5] dark:hover:text-[#FFC6E8]"
          >
            Disclaimer & Rights
          </Link>
        </div>
      </div>
    </footer>
  );
}
