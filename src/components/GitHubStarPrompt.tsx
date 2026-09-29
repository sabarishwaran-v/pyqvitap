"use client";

import { useState, useEffect } from "react";
import { Github, Star, X } from "lucide-react";

const STORAGE_KEY = "pyqvitap-github-star-prompt-v1";

export default function GitHubStarPrompt() {
  const [isRendered, setIsRendered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const alreadyHandled = window.localStorage.getItem(STORAGE_KEY);
      if (alreadyHandled) {
        return;
      }
    } catch {
      return;
    }

    const timer = setTimeout(() => {
      setIsRendered(true);
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "dismissed");
    } catch {}
    setIsVisible(false);
    setTimeout(() => setIsRendered(false), 300);
  };

  const handleStarClick = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "starred");
    } catch {}
    setIsVisible(false);
    setTimeout(() => setIsRendered(false), 300);
  };

  if (!isRendered) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-label="GitHub Star Prompt"
      aria-modal="false"
      className={`fixed bottom-4 left-4 z-[45] w-[calc(100%-2rem)] max-w-sm pointer-events-auto transition-all duration-300 ease-out sm:bottom-6 sm:left-6 ${
        isVisible
          ? "translate-y-0 scale-100 opacity-100"
          : "pointer-events-none translate-y-4 scale-95 opacity-0"
      }`}
    >
      <div className="relative overflow-hidden rounded-2xl border border-[#7480FF]/30 bg-white/95 p-4 shadow-2xl backdrop-blur-md dark:border-[#3A3745] dark:bg-[#130E1F]/95 sm:p-5">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-3 top-3 rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-[#1E1B2E] dark:hover:text-gray-200"
          aria-label="Close prompt"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Content */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
            <Star className="h-5 w-5 fill-amber-400 text-amber-500" />
          </div>
          <div className="pr-4">
            <h3 className="font-jost text-base font-bold text-gray-900 dark:text-white">
              Enjoying PyqVitAp?
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
              PyqVitAp is a student-built open-source project. If you find it
              useful, consider giving us a star on GitHub — it helps more
              students discover the project.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-xl px-3 py-1.5 text-xs font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-[#1E1B2E] dark:hover:text-gray-200"
          >
            Maybe later
          </button>
          <a
            href="https://github.com/sabarishwaran-v/pyqvitap"
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleStarClick}
            className="flex items-center gap-1.5 rounded-xl bg-[#F5C542] px-3.5 py-1.5 text-xs font-semibold text-[#17131F] shadow-sm transition hover:bg-[#EBB834] active:scale-95"
          >
            <Github className="h-3.5 w-3.5 shrink-0 text-[#17131F]" />
            <span>⭐ Star us on GitHub</span>
          </a>
        </div>
      </div>
    </div>
  );
}
