"use client";

import React from "react";
import { MAINTENANCE_MODE } from "@/config/maintenance";

export default function RunningAnnouncement() {
  const maintenanceText = "🚧 PyqVitAp is currently under maintenance. We expect to be back before 9 October 2026.";
  const maintenanceItems = [maintenanceText, maintenanceText, maintenanceText];

  const announcementText =
    "Current semester courses across all branches are live (5,070 papers / 264 courses). Remaining 6,000+ papers for subsequent semesters will be added in the coming weeks.";
  // 3 repetitions per track ensure full coverage on ultra-wide / 4K displays
  const announcementItems = [announcementText, announcementText, announcementText];

  if (MAINTENANCE_MODE) {
    return (
      <div className="relative z-[55] w-full overflow-hidden border-b border-yellow-500/30 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 py-2 text-xs font-medium text-yellow-700 dark:border-yellow-500/30 dark:from-[#1a1505] dark:via-[#141004] dark:to-[#1a1505] dark:text-yellow-400 select-none">
        <div className="relative flex w-full items-center">
          {/* Static Left Glowing Dot */}
          <div className="z-10 flex shrink-0 items-center pl-4 pr-3 bg-amber-50 dark:bg-[#1a1505]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-500" />
            </span>
          </div>

          {/* Marquee Running Container with Edge Mask */}
          <div className="flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_16px,black_calc(100%-16px),transparent)] [-webkit-mask-image:linear-gradient(to_right,transparent,black_16px,black_calc(100%-16px),transparent)]">
            <div className="animate-marquee flex items-center text-xs font-semibold text-yellow-600 dark:text-yellow-400">
              {/* Track 1 */}
              <div className="flex shrink-0 items-center gap-8 pr-8">
                {maintenanceItems.map((text, index) => (
                  <div key={`m1-${index}`} className="flex shrink-0 items-center gap-4">
                    <span>{text}</span>
                    <span className="text-yellow-500/60 dark:text-yellow-500/40">•</span>
                  </div>
                ))}
              </div>
              {/* Track 2 (Clone for infinite seamless loop) */}
              <div className="flex shrink-0 items-center gap-8 pr-8" aria-hidden="true">
                {maintenanceItems.map((text, index) => (
                  <div key={`m2-${index}`} className="flex shrink-0 items-center gap-4">
                    <span>{text}</span>
                    <span className="text-yellow-500/60 dark:text-yellow-500/40">•</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-[55] w-full overflow-hidden border-b border-purple-300/40 bg-gradient-to-r from-[#EDE8FF] via-[#E8EAFF] to-[#EDE8FF] py-2 text-xs font-medium text-purple-950 dark:border-purple-900/50 dark:from-[#170E2E] dark:via-[#130B26] dark:to-[#170E2E] dark:text-purple-200 select-none">
      <div className="relative flex w-full items-center">
        {/* Static Left Glowing Dot */}
        <div className="z-10 flex shrink-0 items-center pl-4 pr-3 bg-[#EDE8FF] dark:bg-[#170E2E]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-600" />
          </span>
        </div>

        {/* Marquee Running Container with Edge Mask */}
        <div className="flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_16px,black_calc(100%-16px),transparent)] [-webkit-mask-image:linear-gradient(to_right,transparent,black_16px,black_calc(100%-16px),transparent)]">
          <div className="animate-marquee flex items-center text-xs">
            {/* Track 1 */}
            <div className="flex shrink-0 items-center gap-8 pr-8">
              {announcementItems.map((text, index) => (
                <div key={`t1-${index}`} className="flex shrink-0 items-center gap-3">
                  <span>{text}</span>
                  <span className="text-purple-400 dark:text-purple-700 mx-2">•</span>
                </div>
              ))}
            </div>
            {/* Track 2 (Clone for infinite seamless loop) */}
            <div className="flex shrink-0 items-center gap-8 pr-8" aria-hidden="true">
              {announcementItems.map((text, index) => (
                <div key={`t2-${index}`} className="flex shrink-0 items-center gap-3">
                  <span>{text}</span>
                  <span className="text-purple-400 dark:text-purple-700 mx-2">•</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
