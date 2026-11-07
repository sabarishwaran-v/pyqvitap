import { SignUp } from "@clerk/nextjs";
import { pyqvitapClerkAppearance } from "@/config/clerk-theme";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { sanitizeRedirectUrl } from "@/config/auth";

export default function SignUpPage({
  searchParams,
}: {
  searchParams?: { redirect_url?: string; __clerk_status?: string; __clerk_created_session?: string; __clerk_handshake?: string };
}) {
  const isClerkCallback = Boolean(
    searchParams?.__clerk_status ||
    searchParams?.__clerk_created_session ||
    searchParams?.__clerk_handshake
  );

  // If this is a normal navigation to /sign-up, redirect to homepage ("/?mode=sign-up")
  // while preserving any requested redirect_url
  if (!isClerkCallback) {
    const rawRedirect = searchParams?.redirect_url;
    const safeRedirect = sanitizeRedirectUrl(rawRedirect, "/");
    if (safeRedirect && safeRedirect !== "/") {
      redirect(`/?mode=sign-up&redirect_url=${encodeURIComponent(safeRedirect)}`);
    } else {
      redirect("/?mode=sign-up");
    }
  }

  return (
    <div className="relative flex min-h-[85vh] flex-col items-center justify-center px-4 py-12">
      {/* Background radial gradient */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <div className="h-[500px] w-[500px] rounded-full bg-purple-600/15 blur-[120px]" />
      </div>

      <div className="relative z-10 mb-6 flex flex-col items-center">
        <Link href="/" className="flex items-center gap-2.5 transition hover:opacity-90">
          <Image
            src="/assets/images/navbar_logo.png?v=5"
            alt="PyqVitAp Logo"
            width={36}
            height={36}
            className="rounded-lg shadow-md"
          />
          <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent">
            PyqVitAp
          </span>
        </Link>
        <p className="mt-2 text-xs font-medium text-zinc-400">
          Create an account using your <span className="text-purple-300 font-semibold">@vitapstudent.ac.in</span> or <span className="text-purple-300 font-semibold">@vitap.ac.in</span> email
        </p>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
          <SignUp
            appearance={pyqvitapClerkAppearance}
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
            fallbackRedirectUrl="/"
          />
        ) : (
          <div className="rounded-2xl border border-purple-500/20 bg-[#0f0926]/90 p-8 text-center text-zinc-300 shadow-2xl backdrop-blur-xl">
            <h2 className="text-lg font-bold text-white mb-2">Clerk Setup Pending</h2>
            <p className="text-xs text-zinc-400 mb-6">
              Authentication is configured in code and ready. Please configure <code className="text-purple-300">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> in your environment to display the live Clerk sign-up form.
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-600/30 transition hover:bg-purple-700"
            >
              Return Home
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
