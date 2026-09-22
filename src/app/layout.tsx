import "@/styles/globals.css";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@/components/theme-provider";
import { GeistSans } from "geist/font/sans";
import Script from "next/script";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ChildrenWrapper from "@/components/ChildrenWrapper";
import { CoursesProvider } from "@/context/courseContext";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  metadataBase: new URL("https://pyqvitap.vercel.app/"),
  title: "PyqVitAp | Explore VIT-AP Previous Year Question Papers",
  description:
    "Prepare and ace your CAT and FAT exams with PyqVitAp. Search 5k+ question papers across all branches, slots, and years in seconds.",
  icons: [
    { rel: "icon", url: "/assets/images/favicon.svg?v=4" },
    { rel: "apple-touch-icon", url: "/assets/images/apple-touch-icon.png?v=4" },
  ],
  openGraph: {
    title: "PyqVitAp | Exam Resources",
    images: [
      {
        url: "/assets/images/papers.png?v=3",
        width: 1200,
        height: 630,
        alt: "PyqVitAp - 5k+ VIT-AP Previous Year Papers",
      },
    ],
    url: "https://pyqvitap.vercel.app/",
    type: "website",
    description:
      "Prepare and ace your CAT and FAT exams with PyqVitAp. Search 5k+ question papers across all branches, slots, and years in seconds.",
    siteName: "PyqVitAp",
  },
  twitter: {
    card: "summary_large_image",
    title: "PyqVitAp | VIT-AP Previous Year Question Papers",
    description:
      "Prepare and ace your CAT and FAT exams with PyqVitAp. Search 5k+ question papers across all branches, slots, and years in seconds.",
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
    <html lang="en" className={`${GeistSans.variable}`}>
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
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <Toaster position="top-right" reverseOrder={false} />
          <div className="bg-[#F3F5FF] dark:bg-[#070114]">
            <CoursesProvider>
              <Navbar />
              <ChildrenWrapper>{children}</ChildrenWrapper>
              <Footer />
            </CoursesProvider>
          </div>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
