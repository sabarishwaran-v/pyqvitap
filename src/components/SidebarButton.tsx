"use client";

import React from "react";

const SidebarButton: React.FC<{
  onClick: () => void;
  selected?: boolean;
  className?: string;
  children: React.ReactNode;
}> = ({ onClick, selected = false, className, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={selected}
    className={`cursor-pointer rounded-full border-2 px-2 py-1 font-play text-xs font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-1 dark:focus-visible:ring-[#7480FF] dark:focus-visible:ring-offset-[#070114] ${
      selected
        ? "border-[#B2B8FF] bg-[#B2B8FF] text-black dark:border-[#434dba] dark:bg-[#434dba] dark:text-white"
        : "border-black bg-transparent text-black [@media(hover:hover)]:hover:bg-black/5 dark:border-white dark:bg-transparent dark:text-white dark:[@media(hover:hover)]:hover:bg-white/5"
    } ${className ?? ""}`}
  >
    {children}
  </button>
);

export default SidebarButton;
