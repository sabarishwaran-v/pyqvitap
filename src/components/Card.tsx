"use client";

import React from "react";
import { type IPaper } from "@/interface";
import Image from "next/image";
import { X, Eye, Download, Check, FileText } from "lucide-react";
import {
  extractBracketContent,
  extractWithoutBracketContent,
  formatSlotDisplay,
} from "@/lib/utils/string";
import {
  getSecureUrl,
  getMediaGatewayUrl,
  generateFileName,
  downloadFile,
} from "@/lib/utils/download";
import { Capsule } from "@/components/ui/capsule";
import { cn } from "@/lib/utils";
import PDFViewer from "@/components/newPdfViewer";
import { PaperProvider } from "@/context/PaperContext";
import { trackEvent, trackError } from "@/lib/telemetry";
import { incrementPaperEngagementCount } from "@/lib/feedback";

interface CardProps {
  paper: IPaper;
  onSelect: (paper: IPaper, isSelected: boolean) => void;
  isSelected: boolean;
  isShow?: boolean;
}

const Card = ({ paper, onSelect, isSelected, isShow=true }: CardProps) => {
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [imgError, setImgError] = React.useState(false);
  const [retryCount, setRetryCount] = React.useState(0);

  const handleImageError = React.useCallback(() => {
    if (retryCount < 1) {
      setRetryCount((prev) => prev + 1);
    } else {
      setImgError(true);
      trackError("media_thumbnail_failed", {
        paper_id: paper._id,
        retry_count: retryCount + 1,
      });
    }
  }, [retryCount, paper._id]);

  const thumbnailSrc = React.useMemo(() => {
    const base = getMediaGatewayUrl(paper.thumbnail_url);
    if (retryCount === 1) {
      return base.includes("?") ? `${base}&retry=1` : `${base}?retry=1`;
    }
    return base;
  }, [paper.thumbnail_url, retryCount]);

  const paperContextValue = React.useMemo(
    () => ({
      paperId: paper._id,
      subject: paper.subject,
      exam: paper.exam,
      slot: paper.slot,
      year: paper.year,
      semester: paper.semester,
    }),
    [paper._id, paper.subject, paper.exam, paper.slot, paper.year, paper.semester],
  );

  React.useEffect(() => {
    if (!previewOpen) return;

    trackEvent("paper_preview_opened", {
      paper_id: paper._id,
      subject: paper.subject,
      exam: paper.exam,
      slot: paper.slot,
      year: paper.year,
    });
    incrementPaperEngagementCount();

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [previewOpen, paper._id, paper.subject, paper.exam, paper.slot, paper.year]);

  const handleDownload = async (paper: IPaper) => {
    incrementPaperEngagementCount();
    await downloadFile(getSecureUrl(paper.file_url), generateFileName(paper));
  };

  const handleCheckboxChange = () => {
    onSelect(paper, !isSelected);
  };

  const paperLink = `/paper/${paper._id}`;

  return (
    <>
      <div
        onClick={(e) => {
          const target = e.target as HTMLElement;

          if (target.closest("button, input, svg")) return;

          trackEvent("paper_opened", {
            paper_id: paper._id,
            subject: paper.subject,
            exam: paper.exam,
            slot: paper.slot,
            year: paper.year,
            semester: paper.semester,
            source: "catalogue_card",
          });
          incrementPaperEngagementCount();

          window.open(paperLink, "_blank");
        }}
        className={cn(
          "cursor-pointer overflow-hidden rounded-sm border-2 border-[#734DFF] bg-[#FFFFFF] font-play shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#EFEAFF] hover:shadow-md dark:border-[#36266D] dark:bg-[#171720] dark:shadow-none hover:dark:bg-[#262635]",
          isSelected && "-translate-y-0.5 bg-[#EFEAFF] shadow-md ring-2 ring-[#7480FF]"
        )}
      >
          {imgError ? (
            <div
              className="flex w-full flex-col items-center justify-center bg-[#EFEAFF] p-4 text-[#734DFF] dark:bg-[#1f1f2e] dark:text-[#a588ff] md:h-[250px]"
              style={{ minHeight: "180px" }}
              aria-label={`Preview unavailable for ${paper.subject}`}
            >
              <FileText className="h-12 w-12 stroke-[1.5] opacity-80" />
              <span className="mt-2 font-play text-sm font-semibold tracking-wide">
                {extractBracketContent(paper.subject) || "PYQ PREVIEW"}
              </span>
              <span className="mt-0.5 text-xs opacity-75">
                {paper.exam} {paper.year}
              </span>
            </div>
          ) : (
            <Image
              src={thumbnailSrc}
              alt={paper.subject}
              width={320}
              height={180}
              className="w-full object-cover p-4 pb-3 md:h-[250px]"
              onError={handleImageError}
              unoptimized
            />
          )}
          <div className="justify-center">
            <div className="flex flex-row items-center justify-between px-4 pb-2">
              <div className="text-md font-play font-medium">
                {extractBracketContent(paper.subject)}
              </div>
            </div>

            <div className="h-[1px] w-full bg-[#734DFF] dark:bg-[#36266D]" />

            <div className="space-y-2 p-4">
              <div className="font-play text-lg font-semibold">
                {extractWithoutBracketContent(paper.subject)}
              </div>
              <div className="flex flex-wrap gap-2">
                <Capsule>{paper.exam}</Capsule>
                {Boolean(paper.slot && formatSlotDisplay(paper.slot)) && (
                  <Capsule>{formatSlotDisplay(paper.slot)}</Capsule>
                )}
                <Capsule>{paper.year}</Capsule>
                <Capsule>{paper.semester}</Capsule>
                {paper.school && <Capsule>{paper.school}</Capsule>}
              </div>
            </div>
          </div>

        <div className="flex justify-end gap-2 px-4 pb-2">
          <Eye
           className="cursor-pointer transition-all duration-200 ease-out hover:scale-110"
              onClick={(e) => {
                e.stopPropagation();
                setPreviewOpen(true);
              }}
            />

          <Download
            size={20}
            onClick={(e) => {
              e.stopPropagation();
              void handleDownload(paper);
            }}
            className="cursor-pointer"
          />
        </div>
         
        <div className="flex items-center justify-between gap-2 px-4 pb-4 font-play">
          {isShow && <div className="flex items-center gap-2">
            <input
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                handleCheckboxChange();
              }}
              onClick={(e) => e.stopPropagation()}
              className="h-5 w-5 accent-[#7480FF]"
              type="checkbox"
            />
            <p>Select</p>
          </div>}

          {paper.answer_key_included && (
            <div className="flex items-center gap-2 font-normal text-[#7480FF]">
              <Check color="#7480FF" />
              Answer Key
            </div>
          )}
        </div>
      </div>

      {previewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-6 py-8"
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className="relative h-full w-full max-w-5xl"
          >
            <div
              className="relative mx-auto h-full max-w-[760px]"
            >
              <PaperProvider value={paperContextValue}>
              <button
                className="fixed right-4 top-4 z-[60] rounded-full border border-black/10 bg-white/95 p-2 text-black shadow-md transition hover:bg-white"
                onClick={() => setPreviewOpen(false)}
                aria-label="Close preview"
              >
                <X size={18} />
              </button>
                <PDFViewer
                  url={getSecureUrl(paper.file_url)}
                  name={generateFileName(paper).replace(/\.[^.]+$/, "")}
                  className="h-full overflow-hidden"
                  height="100%"
                  hideControls={true}
                  backgroundColor="transparent"
                  hideScrollbar={true}
                />
              </PaperProvider>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Card;
