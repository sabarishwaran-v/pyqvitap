import Link from "next/link";
import Image from "next/image";
import { FileQuestion, Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-12 text-center text-zinc-900 dark:text-zinc-100">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-zinc-200/80 bg-white/85 p-8 shadow-2xl backdrop-blur-xl dark:border-purple-500/20 dark:bg-[#0c061d]/90 md:p-10">
        <div className="flex flex-col items-center">
          {/* Logo */}
          <div className="mb-6 flex items-center gap-3">
            <Image
              src="/assets/images/navbar_logo.png?v=5"
              alt="PyqVitAp Logo"
              width={42}
              height={42}
              priority
              className="h-10 w-10 rounded-xl shadow-md"
            />
            <span className="bg-gradient-to-r from-[#562EE7] to-[rgba(116,128,255,0.8)] bg-clip-text font-jost text-2xl font-extrabold tracking-wide text-transparent dark:from-[#562EE7] dark:to-[#FFC6E8]">
              PyqVitAp
            </span>
          </div>

          {/* Icon */}
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-purple-500/30 bg-purple-500/10 text-purple-600 shadow-inner dark:text-purple-400">
            <FileQuestion className="h-7 w-7" />
          </div>

          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-2xl">
            Page or paper not found
          </h1>
          <p className="mt-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300 sm:text-sm">
            The question paper or page you requested could not be found or may have been moved.
          </p>

          <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row">
            <Link
              href="/catalogue"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-600/25 transition hover:from-purple-700 hover:to-indigo-700 active:scale-[0.98]"
            >
              <Search className="h-4 w-4" />
              <span>Browse Catalogue</span>
            </Link>

            <Link
              href="/"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white/80 px-5 py-3 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 active:scale-[0.98] dark:border-purple-500/30 dark:bg-[#181033] dark:text-zinc-200 dark:hover:bg-[#201642]"
            >
              <Home className="h-4 w-4" />
              <span>Return Home</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
