"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import { MAINTENANCE_MODE } from "@/config/maintenance";

export default function RunningAnnouncement() {
  const maintenanceText = "🚧 PyqVitAp is currently under maintenance. We expect to be back before 9 October 2026.";
  const maintenanceItems = Array(4).fill(maintenanceText);

  const announcementText =
    "Current semester courses across all branches are live (5,070 papers / 264 courses). Remaining 6,000+ papers for subsequent semesters will be added in the coming weeks.";
  // Repeat items for seamless continuous looping across screen widths
  const announcementItems = Array(4).fill(announcementText);

  if (MAINTENANCE_MODE) {
    return (
      <div className="relative z-[55] w-full overflow-hidden border-b border-yellow-500/30 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 py-2 text-xs font-medium text-yellow-700 dark:border-yellow-500/30 dark:from-[#1a1505] dark:via-[#141004] dark:to-[#1a1505] dark:text-yellow-400">
        <div className="relative flex w-full items-center">
          {/* Static Left Notice Badge */}
          <div className="z-10 flex shrink-0 items-center gap-1.5 bg-amber-50 pl-4 pr-3 dark:bg-[#1a1505]">
            <span className="flex h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
            <span className="flex items-center gap-1 rounded-full bg-yellow-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-yellow-700 dark:bg-yellow-400/20 dark:text-yellow-300">
              <Sparkles className="h-3 w-3" />
              Notice
            </span>
          </div>

          {/* Marquee Running Container */}
          <div className="flex-1 overflow-hidden">
            <div className="animate-marquee flex items-center gap-8 text-xs font-semibold text-yellow-600 dark:text-yellow-400">
              {maintenanceItems.map((text, index) => (
                <div key={index} className="flex shrink-0 items-center gap-4">
                  <span>{text}</span>
                  <span className="text-yellow-500/60 dark:text-yellow-500/40">•</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            {[...announcementItems, ...announcementItems].map((text, index) => (
              <div key={index} className="flex shrink-0 items-center gap-3">
                <span>{text}</span>
                <span className="text-purple-400 dark:text-purple-700 mx-2">•</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
