import "@/styles/globals.css";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@/components/theme-provider";
import { GeistSans } from "geist/font/sans";
import Script from "next/script";
import type { Metadata, Viewport } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ChildrenWrapper from "@/components/ChildrenWrapper";
import GitHubStarPrompt from "@/components/GitHubStarPrompt";
import { CoursesProvider } from "@/context/courseContext";
import { MAINTENANCE_MODE } from "@/config/maintenance";
import MaintenanceGate from "@/components/MaintenanceGate";
import { AuthProvider } from "@/components/AuthProvider";
import PostHogProviderWrapper from "@/components/analytics/PostHogProvider";
import ReliabilityAnnouncementModal from "@/components/ReliabilityAnnouncementModal";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://pyqvitap.site/"),
  title: MAINTENANCE_MODE
    ? "PyqVitAp — Under Maintenance"
    : "PyqVitAp | Explore VIT-AP Previous Year Question Papers",
  description: MAINTENANCE_MODE
    ? "PyqVitAp is temporarily offline while we work on important improvements to the platform."
    : "Prepare and ace your CAT and FAT exams with PyqVitAp. Search 5k+ question papers across all branches, slots, and years in seconds.",
  icons: [
    { rel: "icon", url: "/assets/images/favicon.svg?v=4" },
    { rel: "apple-touch-icon", url: "/assets/images/apple-touch-icon-v5.png" },
  ],
  openGraph: {
    title: MAINTENANCE_MODE
      ? "PyqVitAp — Under Maintenance"
      : "PyqVitAp | Exam Resources",
    images: [
      {
        url: "/assets/images/papers.png?v=3",
        width: 1200,
        height: 630,
        alt: "PyqVitAp - 5k+ VIT-AP Previous Year Papers",
      },
    ],
    url: "https://pyqvitap.site/",
    type: "website",
    description: MAINTENANCE_MODE
      ? "PyqVitAp is temporarily offline while we work on important improvements to the platform."
      : "Prepare and ace your CAT and FAT exams with PyqVitAp. Search 5k+ question papers across all branches, slots, and years in seconds.",
    siteName: "PyqVitAp",
  },
  twitter: {
    card: "summary_large_image",
    title: MAINTENANCE_MODE
      ? "PyqVitAp — Under Maintenance"
      : "PyqVitAp | VIT-AP Previous Year Question Papers",
    description: MAINTENANCE_MODE
      ? "PyqVitAp is temporarily offline while we work on important improvements to the platform."
      : "Prepare and ace your CAT and FAT exams with PyqVitAp. Search 5k+ question papers across all branches, slots, and years in seconds.",
    images: [
      {
        url: "/assets/images/papers.png?v=3",
        width: 1200,
        height: 630,
        alt: "PyqVitAp - 5k+ VIT-AP Previous Year Papers",
      },
    ],
  },
  applicationName: "PyqVitAp",
  appleWebApp: {
    capable: true,
    title: "PyqVitAp",
    statusBarStyle: "default",
  },
  keywords: [
    "pyqvitap",
    "PyqVitAp",
    "pyqvitap.vercel.app",
    "Sabarish V",
    "VITAP",
    "VIT-AP",
    "VITAP Papers",
    "VIT AP Papers",
    "VITAP PYQs",
    "VIT-AP PYQs",
    "VITAP past papers",
    "VIT-AP past papers",
    "VITAP question papers",
    "VIT-AP question papers",
    "VITAP exams",
    "VIT-AP exams",
    "FFCS Mate",
    "Vellore Institute of Technology Andhra Pradesh",
    "VITAP University",
    "Exam solutions",
    "Student resources",
    "VITAP exam papers",
    "Exam preparation",
    "Previous year papers VITAP",
    "VITAPCAT1",
    "VITAPCAT2",
    "VITAPFAT",
    "VITAP CAT1 papers",
    "VITAP CAT2 papers",
    "VITAP FAT papers",
    "VITAP exam question papers",
    "VITAP question bank",
    "VITAP previous year question papers",
    "VITAP academic resources",
    "VITAP exam pattern",
    "VITAP preparation tips",
    "VITAP question solutions",
    "VITAP model papers",
    "VITAP solved papers",
    "VITAP test papers",
    "VITAP sample papers",
    "VITAP question papers with solutions",
    "VITAP exam guide",
    "VITAP CAT1 preparation",
    "VITAP CAT2 preparation",
    "VITAP FAT preparation",
    "VITAP previous year CAT1 papers",
    "VITAP previous year CAT2 papers",
    "VITAP previous year FAT papers",
    "VITAP exam resources",
    "VITAP academic help",
    "VITAP syllabus",
    "VITAP question paper pattern",
    "VITAP 2023 papers",
    "VITAP 2024 papers",
    "VITAP exam practice",
    "VITAP question paper archives",
    "VITAP study materials",
    "VITAP engineering papers",
    "VITAP exam strategy",
    "VITAP online exam resources",
    "VITAP question paper download",
    "VITAP important questions",
    "VITAP question paper solutions",
  ],
  robots: "index, follow",
};
export const revalidate = 60;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${GeistSans.variable}`} suppressHydrationWarning>
      <meta
        name="google-site-verification"
        content="7eR_r20eSByy6ReESw2g-EcMaBRmh_Zpz3q8SbvCH64"
      />
      <head>
        <Script
           async
          src="https://www.googletagmanager.com/gtag/js?id=G-J5CD036GJP"
        ></Script>
        <Script id="google-analytics">
          {`window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-J5CD036GJP');`}
        </Script>
        {MAINTENANCE_MODE && (
          <>
            <link
              rel="preload"
              href="/assets/maintenance/poster.webp"
              as="image"
              type="image/webp"
            />
            <link
              rel="preload"
              href="/assets/maintenance/dotlottie-player.wasm"
              as="fetch"
              type="application/wasm"
              crossOrigin="anonymous"
            />
            <link
              rel="preload"
              href="/assets/maintenance/iGV0il5M4W.lottie"
              as="fetch"
              crossOrigin="anonymous"
            />
          </>
        )}
      </head>
      <body>
        <PostHogProviderWrapper>
          <AuthProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="dark"
              enableSystem
              disableTransitionOnChange
            >
              <Toaster position="top-right" reverseOrder={false} />
              <div className="flex min-h-screen flex-col justify-between bg-[#F3F5FF] dark:bg-[#070114]">
                <CoursesProvider>
                  <Navbar />
                  {MAINTENANCE_MODE ? (
                    <MaintenanceGate>{children}</MaintenanceGate>
                  ) : (
                    <>
                      <ChildrenWrapper>{children}</ChildrenWrapper>
                      <GitHubStarPrompt />
                      <ReliabilityAnnouncementModal />
                    </>
                  )}
                  <Footer />
                </CoursesProvider>
              </div>
            </ThemeProvider>
          </AuthProvider>
        </PostHogProviderWrapper>
      </body>
    </html>
  );
}
