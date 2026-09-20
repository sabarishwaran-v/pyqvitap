import { cache } from "react";
import { fetchPaperID } from "@/app/actions/get-papers-by-id";
import RelatedPapers from "@/components/RelatedPaper";
import { type PaperResponse } from "@/interface";
import { extractBracketContent, formatSlotDisplay } from "@/lib/utils/string";
import { type Metadata } from "next";
import { redirect } from "next/navigation";
import { PaperProvider } from "@/context/PaperContext";
import PDFViewer from "@/components/newPdfViewer";

const getPaper = cache(async (id: string): Promise<PaperResponse | null> => {
  try {
    return await fetchPaperID(id);
  } catch {
    return null;
  }
});

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  try {
    const paper: PaperResponse | null = await getPaper(params.id);

    if (paper) {
      const displaySlot = formatSlotDisplay(paper.slot);
      return {
        metadataBase: new URL("https://pyqvitap.vercel.app/"),
        title: `PyqVitAp | ${paper.subject} | ${paper.exam} | ${displaySlot}`,
        description: `Discover ${paper.subject}'s question paper on PyqVitAp at VIT-AP. Made to help students excel.`,
        icons: [{ rel: "icon", url: "/assets/images/favicon.svg?v=4" }],
        openGraph: {
          title: `PyqVitAp | ${paper.subject} | ${paper.exam} | ${displaySlot}`,
          images: [
            {
              url: "/assets/images/papers.png?v=3",
              width: 1200,
              height: 630,
              alt: `PyqVitAp | ${paper.subject} | ${paper.exam}`,
            },
          ],
          url: "https://pyqvitap.vercel.app/",
          type: "website",
          description: `Discover ${paper.subject}'s question paper on PyqVitAp at VIT-AP. Made to help students excel.`,
          siteName: "PyqVitAp",
        },
        twitter: {
          card: "summary_large_image",
          title: `PyqVitAp | ${paper.subject} | ${paper.exam} | ${displaySlot}`,
          description: `Discover ${paper.subject}'s question paper on PyqVitAp at VIT-AP. Made to help students excel.`,
          images: [
            {
              url: "/assets/images/papers.png?v=3",
              width: 1200,
              height: 630,
              alt: `PyqVitAp | ${paper.subject} | ${paper.exam}`,
            },
          ],
        },
        applicationName: "PyqVitAp",
        keywords: [
          "pyqvitap",
          "PyqVitAp",
          "pyqvitap.vercel.app",
          "VITAP",
          "VIT-AP",
          "VITAP Papers",
          "VIT AP Papers",
          "VITAP PYQs",
          "VIT-AP PYQs",
          "VITAP question papers",
          "VIT-AP question papers",
          "VITAP past papers",
          "VIT-AP past papers",
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
          `${paper.subject} question paper`,
          `${paper.exam} question paper`,
          `${displaySlot} question paper`,
          `${paper.year} question paper`,
          `${paper.subject} question paper`,
          `${paper.exam} question paper`,
          `${displaySlot} question paper`,
          `${paper.year} question paper`,
          `${paper.subject} ${paper.exam} question paper`,
          `${paper.subject} ${displaySlot} question paper`,
          `${paper.subject} ${paper.year} question paper`,
          `${paper.exam} ${displaySlot} question paper`,
          `${paper.exam} ${paper.year} question paper`,
          `${paper.subject} ${paper.exam} ${paper.year} question paper`,
          `${paper.subject} ${paper.exam} ${displaySlot} question paper`,
          `${paper.subject} ${paper.year} ${displaySlot} question paper`,
          `${paper.exam} ${paper.year} ${displaySlot} question paper`,
          `${paper.subject} ${paper.exam} ${paper.year} ${displaySlot} question paper`,
          `${paper.year} ${paper.subject} ${displaySlot} question paper`,
          `${paper.year} ${paper.exam} ${paper.subject} question paper`,
          `${paper.exam} ${paper.subject} ${paper.year} question paper`,
          `${displaySlot} ${paper.subject} ${paper.year} question paper`,
          `${displaySlot} ${paper.exam} ${paper.year} question paper`,
        ],
        robots: "index, follow",
      };
    }

    return {
      title: "Paper not found",
    };
  } catch {
    return {
      title: "Paper not found",
    };
  }
}
const PaperPage = async ({ params }: { params: { id: string } }) => {
  const paper = await getPaper(params.id);
  if (!paper) {
    redirect("/");
  }
  return (
    <div>
      <h1 className="my-6 flex justify-center gap-4 text-center font-play text-2xl font-semibold md:mb-10 md:text-3xl">
        <div>
          {paper.subject} {paper.exam} {formatSlotDisplay(paper.slot)} {paper.year}
        </div>
      </h1>
      <center>
        <PaperProvider
          value={{
            paperId: params.id,
            subject: paper.subject,
            exam: paper.exam,
            slot: paper.slot,
            year: paper.year,
          }}
        >
          <PDFViewer
            url={paper.file_url}
            name={`${extractBracketContent(paper.subject)}-${paper.exam}-${paper.slot}-${paper.year}`}
          />
        </PaperProvider>
      </center>
      <RelatedPapers />
    </div>
  );
};
export default PaperPage;
