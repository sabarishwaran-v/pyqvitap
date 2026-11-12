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

          if (target.closest("button, input, svg, label")) return;

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
          "group relative flex h-full min-h-[480px] md:min-h-[500px] flex-col justify-between overflow-hidden rounded-xl border-2 border-[#734DFF]/40 bg-white font-play shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-[#734DFF] hover:shadow-lg dark:border-[#36266D] dark:bg-[#130E26] dark:hover:border-[#7480FF] dark:hover:bg-[#181230]",
          isSelected && "-translate-y-1 border-[#7480FF] bg-[#EFEAFF] shadow-lg ring-2 ring-[#7480FF] dark:border-[#7480FF] dark:bg-[#1c1438]"
        )}
      >
        <div className="relative flex h-[240px] md:h-[260px] w-full shrink-0 items-center justify-center overflow-hidden bg-[#F4F1FD] p-3 dark:bg-[#0E0A1E]">
          {imgError ? (
            <div
              className="flex h-full w-full flex-col items-center justify-center text-[#734DFF] dark:text-[#a588ff]"
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
            <div className="relative h-full w-full">
              <Image
                src={thumbnailSrc}
                alt={paper.subject}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                className="object-contain p-1 transition-transform duration-200 group-hover:scale-[1.02]"
                onError={handleImageError}
                unoptimized
              />
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-4 pb-2">
          <div className="font-play text-md font-medium text-gray-700 dark:text-white/80 line-clamp-1">
            {extractBracketContent(paper.subject) || "PYQ"}
          </div>

          <div
            title={extractWithoutBracketContent(paper.subject)}
            className="mt-1 line-clamp-2 font-play text-lg font-semibold text-gray-900 dark:text-white min-h-[3.5rem] flex items-center"
          >
            {extractWithoutBracketContent(paper.subject)}
          </div>

          <div className="mt-3 flex min-h-[68px] flex-wrap items-start content-start gap-2 overflow-hidden">
            <Capsule>{paper.exam}</Capsule>
            {Boolean(paper.slot && formatSlotDisplay(paper.slot)) && (
              <Capsule>{formatSlotDisplay(paper.slot)}</Capsule>
            )}
            <Capsule>{paper.year}</Capsule>
            <Capsule>{paper.semester}</Capsule>
            {paper.school && <Capsule>{paper.school}</Capsule>}
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-gray-100 px-4 pb-4 pt-3 dark:border-white/5 font-play">
          <div className="flex items-center gap-2">
            {isShow && (
              <label
                onClick={(e) => e.stopPropagation()}
                className="flex cursor-pointer items-center gap-2 text-base font-play text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
              >
                <input
                  checked={isSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleCheckboxChange();
                  }}
                  className="h-5 w-5 rounded accent-[#7480FF] cursor-pointer"
                  type="checkbox"
                />
                <p>Select</p>
              </label>
            )}

            {paper.answer_key_included && (
              <div className="flex items-center gap-2 font-normal text-[#7480FF]">
                <Check color="#7480FF" className="h-5 w-5" />
                Answer Key
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
            <Eye
              className="cursor-pointer transition-all duration-200 ease-out hover:scale-110 hover:text-[#7480FF]"
              onClick={(e) => {
                e.stopPropagation();
                setPreviewOpen(true);
              }}
              aria-label="Preview paper"
            />
            <Download
              size={20}
              onClick={(e) => {
                e.stopPropagation();
                void handleDownload(paper);
              }}
              className="cursor-pointer transition-all duration-200 ease-out hover:scale-110 hover:text-[#7480FF]"
              aria-label="Download paper"
            />
          </div>
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
