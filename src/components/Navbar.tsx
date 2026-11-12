"use client";

import { useState, useEffect } from "react";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import ModeToggle from "@/components/toggle-theme";
import {
  ArrowDownLeftIcon,
  ArrowUpRight,
  ChevronDown,
  Github,
  LogIn,
  Pin,
} from "lucide-react";
import { SignedIn as ClerkSignedIn } from "@clerk/nextjs";
import { PyqvitapUserAvatar } from "@/components/auth/PyqvitapSignedIn";
import { useAuthMode } from "@/context/AuthModeContext";

function SignedIn({ children }: { children: React.ReactNode }) {
  const { authEnabled } = useAuthMode();
  const [isLocalhost, setIsLocalhost] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const h = window.location.hostname;
      return h === "localhost" || h === "127.0.0.1";
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const h = window.location.hostname;
      setIsLocalhost(h === "localhost" || h === "127.0.0.1");
    }
  }, []);

  if (!authEnabled || isLocalhost) {
    return <>{children}</>;
  }

  return <ClerkSignedIn>{children}</ClerkSignedIn>;
}
import FloatingNavbar from "./FloatingNavbar";
import PWAInstallButton from "./ui/PWAInstallButton";
import SearchBarChild from "./Searchbar/searchbar-child";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useCourses } from "@/context/courseContext";
import PinnedModal from "./ui/PinnedModal";
import RequestModal from "./ui/RequestModal";
import Announcement from "./ui/announcement/Announcement";
import RunningAnnouncement from "./RunningAnnouncement";
import { getSubjectEvent, type EventData } from "@/config/events";
import { MAINTENANCE_MODE } from "@/config/maintenance";
import { getPyqvitapUserProfileAppearance } from "@/config/clerk-theme";

function Navbar() {
  const pathname: string = usePathname() ?? "/";
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [isTopBannerDismissed, setIsTopBannerDismissed] = useState<boolean>(false);
  const { courses } = useCourses();

  useEffect(() => {
    try {
      const storageKey = "announcement:global-top-banner:dismissed";
      const timestampKey = `${storageKey}:time`;
      const isDismissed = window.localStorage.getItem(storageKey) === "true";
      const dismissedAt = window.localStorage.getItem(timestampKey);
      const TWELVE_HOURS = 12 * 60 * 60 * 1000;

      if (isDismissed && dismissedAt) {
        const timePassed = Date.now() - parseInt(dismissedAt, 10);
        if (timePassed < TWELVE_HOURS) {
          setIsTopBannerDismissed(true);
        } else {
          window.localStorage.removeItem(storageKey);
          window.localStorage.removeItem(timestampKey);
          setIsTopBannerDismissed(false);
        }
      } else if (isDismissed) {
        setIsTopBannerDismissed(true);
      } else {
        setIsTopBannerDismissed(false);
      }
    } catch {
      setIsTopBannerDismissed(false);
    }
  }, []);

  const handleDismissTopBanner = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsTopBannerDismissed(true);
    try {
      const storageKey = "announcement:global-top-banner:dismissed";
      window.localStorage.setItem(storageKey, "true");
      window.localStorage.setItem(`${storageKey}:time`, Date.now().toString());
    } catch {}
  };

  const [currentEvent, setCurrentEvent] = useState<EventData | null>(null);

  useEffect(() => {
    setCurrentEvent(getSubjectEvent());
  }, []);

  const renderHomePageButtons = () => {
    if (MAINTENANCE_MODE) {
      return (
        <SignedIn>
          <Link
            href="/pinned"
            className="flex h-8 items-center gap-1 rounded-full border border-[#3A3745] bg-[#e8e9ff] px-2.5 py-1 text-xs font-semibold text-gray-700 transition hover:bg-slate-50 dark:bg-black dark:text-white dark:hover:bg-[#1A1823] sm:h-9 sm:gap-2 sm:px-3.5 sm:py-1.5 sm:text-sm md:h-10 md:px-4 md:py-2 md:text-base"
          >
            <Pin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="truncate">Pin Subjects</span>
          </Link>

          <Link
            href="/request"
            className="flex h-8 items-center gap-1 rounded-full border border-[#3A3745] bg-[#e8e9ff] px-2.5 py-1 text-xs font-semibold text-gray-700 transition hover:bg-slate-50 dark:bg-black dark:text-white dark:hover:bg-[#1A1823] sm:h-9 sm:gap-2 sm:px-3.5 sm:py-1.5 sm:text-sm md:h-10 md:px-4 md:py-2 md:text-base"
          >
            <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="truncate">Request Paper</span>
          </Link>
        </SignedIn>
      );
    }

    return (
      <SignedIn>
        <div className="flex h-8 items-center gap-1 rounded-full border border-[#3A3745] bg-[#e8e9ff] px-2.5 py-1 text-xs font-semibold text-gray-700 transition hover:bg-slate-50 dark:bg-black dark:text-white dark:hover:bg-[#1A1823] sm:h-9 sm:gap-2 sm:px-3.5 sm:py-1.5 sm:text-sm md:h-10 md:px-4 md:py-2 md:text-base">
          <span className="truncate">
            <PinnedModal />
          </span>
        </div>

        <div className="flex h-8 items-center gap-1 rounded-full border border-[#3A3745] bg-[#e8e9ff] px-2.5 py-1 text-xs font-semibold text-gray-700 transition hover:bg-slate-50 dark:bg-black dark:text-white dark:hover:bg-[#1A1823] sm:h-9 sm:gap-2 sm:px-3.5 sm:py-1.5 sm:text-sm md:h-10 md:px-4 md:py-2 md:text-base">
          <span className="truncate">
            <RequestModal />
          </span>
        </div>
      </SignedIn>
    );
  };

  return (
    <div className="sticky top-0 z-[50] w-full bg-[#B2B8FF] dark:bg-[#130E1F]">
      <RunningAnnouncement />

      <div className="flex items-center justify-between bg-inherit px-4 py-4 md:px-8 md:py-5">
        {}
        <div className="relative flex items-center gap-3 md:gap-4">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/assets/images/navbar_logo.png?v=5"
              alt="PyqVitAp Logo"
              height={48}
              width={48}
              className="h-9 w-9 rounded-xl shadow-md transition-transform hover:scale-105 md:h-12 md:w-12"
            />
            <span
              className="bg-gradient-to-r from-[#562EE7] to-[rgba(116,128,255,0.8)] bg-clip-text font-jost text-3xl min-[360px]:text-4xl font-bold tracking-wide text-transparent dark:from-[#562EE7] dark:to-[#FFC6E8] md:text-6xl"
            >
              PyqVitAp
            </span>
          </Link>

          {!MAINTENANCE_MODE && pathname === "/catalogue" ? (
            <SignedIn>
              <div className="relative ml-4 hidden xl:block">
                <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-[#3A3745] bg-[#e8e9ff] text-gray-700 shadow-lg transition-transform duration-200 hover:scale-105 hover:bg-slate-50 active:scale-95 dark:bg-black dark:text-white dark:hover:bg-[#1A1823]"
                      aria-label="Toggle dropdown"
                    >
                      <ChevronDown
                        className={`h-5 w-5 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    className="mt-2 w-56 space-y-1 rounded-3xl border border-[#3A3745] bg-[#e8e9ff] py-2 text-gray-700 shadow-lg backdrop-blur-sm dark:border-[#3A3745] dark:bg-black dark:text-white"
                    align="start"
                  >
                    <DropdownMenuItem
                      asChild
                      onSelect={(e) => {
                        if (MAINTENANCE_MODE) setDropdownOpen(false);
                        else e.preventDefault();
                      }}
                    >
                      {MAINTENANCE_MODE ? (
                        <Link
                          href="/pinned"
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-1 transition hover:bg-[#1A1823] hover:text-white"
                        >
                          <Pin className="h-4 w-4" />
                          <span>Pin Subjects</span>
                        </Link>
                      ) : (
                        <div className="flex w-full items-center gap-3 rounded-lg px-3 py-1 transition hover:bg-[#1A1823] hover:text-white">
                          <PinnedModal />
                        </div>
                      )}
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      asChild
                      onSelect={(e) => {
                        if (MAINTENANCE_MODE) setDropdownOpen(false);
                        else e.preventDefault();
                      }}
                    >
                      {MAINTENANCE_MODE ? (
                        <Link
                          href="/request"
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-1 transition hover:bg-[#1A1823] hover:text-white"
                        >
                          <ArrowUpRight className="h-4 w-4" />
                          <span>Request Paper</span>
                        </Link>
                      ) : (
                        <div className="flex w-full items-center gap-3 rounded-lg px-3 py-1 transition hover:bg-[#1A1823] hover:text-white">
                          <RequestModal />
                        </div>
                      )}
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild>
                      <a
                        href="https://github.com/sabarishwaran-v/pyqvitap"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-1 text-sm font-medium transition hover:bg-[#1A1823] hover:text-white"
                      >
                        <Github className="h-4 w-4" />
                        <span>⭐ Star us on GitHub</span>
                      </a>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </SignedIn>
          ) : (
            <>
              <SignedIn>
                <div className="relative ml-2 hidden lg:block xl:hidden">
                  <DropdownMenu
                    open={dropdownOpen}
                    onOpenChange={setDropdownOpen}
                  >
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-[#3A3745] bg-[#e8e9ff] text-gray-700 shadow-lg transition-transform duration-200 hover:scale-105 hover:bg-slate-50 active:scale-95 dark:bg-black dark:text-white dark:hover:bg-[#1A1823]"
                      aria-label="Toggle dropdown"
                    >
                      <ChevronDown
                        className={`h-5 w-5 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    className="flex w-72 flex-col gap-1 space-y-1 rounded-3xl border border-[#3A3745] bg-[#e8e9ff] px-4 py-3 text-gray-700 shadow-lg backdrop-blur-sm transition-colors dark:border-[#3A3745] dark:bg-black dark:text-white xl:hidden"
                    align="end"
                  >
                    <DropdownMenuItem
                      asChild={MAINTENANCE_MODE}
                      onSelect={(e) => {
                        if (MAINTENANCE_MODE) setDropdownOpen(false);
                        else e.preventDefault();
                      }}
                    >
                      {MAINTENANCE_MODE ? (
                        <Link
                          href="/pinned"
                          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-1 text-sm font-medium transition hover:bg-[#1A1823] hover:text-white"
                        >
                          <Pin className="h-4 w-4" />
                          <span>Pin Subjects</span>
                        </Link>
                      ) : (
                        <PinnedModal />
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      asChild={MAINTENANCE_MODE}
                      onSelect={(e) => {
                        if (MAINTENANCE_MODE) setDropdownOpen(false);
                        else e.preventDefault();
                      }}
                    >
                      {MAINTENANCE_MODE ? (
                        <Link
                          href="/request"
                          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-1 text-sm font-medium transition hover:bg-[#1A1823] hover:text-white"
                        >
                          <ArrowUpRight className="h-4 w-4" />
                          <span>Request Paper</span>
                        </Link>
                      ) : (
                        <RequestModal />
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a
                        href="https://github.com/sabarishwaran-v/pyqvitap"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-1 text-sm font-medium transition hover:bg-[#1A1823] hover:text-white"
                      >
                        <Github className="h-4 w-4" />
                        <span>⭐ Star us on GitHub</span>
                      </a>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </SignedIn>
            <div className="hidden h-10 items-center gap-2 xl:flex">
              {renderHomePageButtons()}
            </div>
          </>
        )}
        </div>

        {}
        {!MAINTENANCE_MODE && pathname === "/catalogue" && (
          <div className="ml-8 mr-12 hidden flex-1 justify-center md:flex">
            <div className="w-full max-w-[700px]">
              <SearchBarChild initialSubjects={courses} />
            </div>
          </div>
        )}

        {}
        <div
          className={`${!MAINTENANCE_MODE && pathname === "/catalogue" ? "xl:flex" : "lg:flex"} hidden items-center gap-4`}
        >
          <SignedIn>
            <a
              href="https://github.com/sabarishwaran-v/pyqvitap"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View PyqVitAp on GitHub"
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#3A3745] bg-[#e8e9ff] text-gray-700 shadow-sm transition hover:scale-105 hover:bg-slate-50 hover:text-black active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#562EE7] focus-visible:ring-offset-2 focus-visible:ring-offset-[#B2B8FF] dark:bg-black dark:text-white dark:hover:bg-[#1A1823] dark:hover:text-white dark:focus-visible:ring-[#7480FF] dark:focus-visible:ring-offset-[#130E1F] after:absolute after:-inset-1"
            >
              <Github className="h-5 w-5 shrink-0 text-gray-700 dark:text-white" />
            </a>
          </SignedIn>

          <div className="rounded-full border border-[#3A3745] p-1">
            <ModeToggle />
          </div>

          <SignedIn>
            <div className="hidden max-w-[200px] md:block">
              <PWAInstallButton />
            </div>

            <Link href={MAINTENANCE_MODE ? "/upload" : (pathname === "/upload" ? "/" : "/upload")}>
              <div className="flex h-8 items-center gap-1 rounded-full border border-[#3A3745] bg-[#e8e9ff] px-2.5 py-1 text-xs font-semibold text-gray-700 transition hover:bg-slate-50 dark:bg-black dark:text-white dark:hover:bg-[#1A1823] sm:h-9 sm:gap-1.5 sm:px-3.5 sm:py-1.5 sm:text-sm md:h-10 md:gap-2 md:px-4 md:py-2 md:text-base">
                <ArrowDownLeftIcon className="h-3.5 w-3.5 rotate-90 sm:h-4 sm:w-4" />
                <span className="truncate">
                  {MAINTENANCE_MODE ? "Upload Papers" : (pathname === "/upload" ? "Search Papers" : "Upload Papers")}
                </span>
              </div>
            </Link>
            <div className="flex items-center">
              <PyqvitapUserAvatar isDark={isDark} />
            </div>
          </SignedIn>
        </div>

        {}
        <div
          className={`${!MAINTENANCE_MODE && pathname === "/catalogue" ? "xl:hidden" : "lg:hidden"} shrink-0`}
        >
          <FloatingNavbar onNavigate={() => void 0} />
        </div>
      </div>
    </div>
  );
}

export default Navbar;
