"use client";

import { Pin, PinOff } from "lucide-react";

export default function PinButton({
  isPinned,
  onToggle,
  disabled,
}: {
  isPinned: boolean;
  onToggle?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      onClick={onToggle}
      className={`cursor-pointer flex items-center gap-2 rounded-full border border-[#3A3745] px-3 py-3 sm:px-4 sm:py-2 text-sm font-medium transition ${
        isPinned
          ? "bg-purple-700 text-white hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-500"
          : "bg-[#e8e9ff] text-gray-700 hover:bg-slate-50 dark:bg-black dark:text-white dark:hover:bg-[#1A1823]"
      }`}
      disabled={disabled}
    >
      {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
      <span className="hidden sm:inline">{isPinned ? "Unpin" : "Pin"}</span>
    </button>
  );
}
