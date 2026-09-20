"use client";

import React from "react";

const SidebarButton: React.FC<{
  onClick: () => void;
  selected?: boolean;
  className?: string;
  children: React.ReactNode;
}> = ({ onClick, selected = false, className, children }) => (
  <div
    onClick={onClick}
    className={`cursor-pointer rounded-full border-2 px-2 py-1 font-play text-xs font-semibold ${
      selected
        ? "border-[#B2B8FF] bg-[#B2B8FF] text-black dark:border-[#434dba] dark:bg-[#434dba] dark:text-white"
        : "border-black hover:bg-[#B2B8FF] hover:text-black dark:border-white dark:hover:border-[#434dba] dark:hover:bg-[#434dba] dark:hover:text-white"
    } ${className ?? ""}`}
  >
    {children}
  </div>
);

export default SidebarButton;
