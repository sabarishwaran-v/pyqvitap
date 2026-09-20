"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";

export default function RunningAnnouncement() {
  const announcementItems = [
    {
      badge: "5K+ LIVE",
      text: "5,000+ past year papers are live now — sourced directly from the DSpace repository to help VIT-AP students excel!",
      link: "/catalogue",
      linkText: "Browse Papers",
    },
    {
      badge: "ROADMAP",
      text: "6,000+ additional question papers are actively being processed and will be added in the coming weeks.",
      link: "/catalogue",
      linkText: "View Catalogue",
    },
    {
      badge: "CONTRIBUTE",
      text: "Have recent CAT or FAT question papers? Help your fellow batchmates by uploading them to the repository.",
      link: "/upload",
      linkText: "Upload Now",
    },
    {
      badge: "FREE & OPEN",
      text: "No login or sign-up required. Freely access, search, and download question papers for all branches and slots.",
      link: "/catalogue",
      linkText: "Explore",
    },
  ];

  return (
    <div className="relative z-[55] w-full overflow-hidden border-b border-purple-300/40 bg-gradient-to-r from-[#EDE8FF] via-[#E8EAFF] to-[#EDE8FF] py-2 text-xs font-medium text-purple-950 dark:border-purple-900/50 dark:from-[#170E2E] dark:via-[#130B26] dark:to-[#170E2E] dark:text-purple-200">
      <div className="relative flex w-full items-center">
        {/* Static Left Notice Badge */}
        <div className="z-10 flex shrink-0 items-center gap-1.5 bg-[#EDE8FF] pl-4 pr-3 dark:bg-[#170E2E]">
          <span className="flex h-2 w-2 rounded-full bg-violet-600 animate-pulse" />
          <span className="flex items-center gap-1 rounded-full bg-purple-600/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:bg-purple-400/15 dark:text-purple-300">
            <Sparkles className="h-3 w-3" />
            Notice
          </span>
        </div>

        {/* Marquee Running Container */}
        <div className="flex-1 overflow-hidden">
          <div className="animate-marquee flex items-center gap-8 text-xs">
            {/* Duplicated for infinite seamless loop */}
            {[...announcementItems, ...announcementItems].map((item, index) => (
              <div key={index} className="flex shrink-0 items-center gap-2">
                <span className="rounded bg-purple-600/15 px-1.5 py-0.5 text-[10px] font-bold text-purple-800 dark:bg-purple-400/20 dark:text-purple-200">
                  {item.badge}
                </span>
                <span>{item.text}</span>
                <Link
                  href={item.link}
                  className="inline-flex items-center gap-0.5 font-bold text-purple-700 underline underline-offset-2 hover:text-purple-900 dark:text-purple-300 dark:hover:text-white"
                >
                  {item.linkText}
                  <ArrowRight className="h-3 w-3" />
                </Link>
                <span className="text-purple-400 dark:text-purple-700 mx-2">•</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
