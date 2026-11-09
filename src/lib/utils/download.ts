import { type IPaper } from "../../interface";
import { extractBracketContent } from "./string";
import axios from "axios";
import { applyWatermarkAndDisclaimer } from "./pdfWatermark";
import { getMediaGatewayUrl } from "./media";
import { trackError } from "../telemetry";
import { incrementPaperEngagementCount, requestDownloadWithFeedback } from "../feedback";

export { getMediaGatewayUrl };

export const getSecureUrl = (url: string): string =>
  getMediaGatewayUrl(url);

export const generateFileName = (paper: IPaper): string => {
  const extension = paper.file_url.split(".").pop();
  const subjectCode = extractBracketContent(paper.subject);
  const slot = paper.slot?.trim();
  const parts = [subjectCode, paper.exam, slot, paper.year].filter(Boolean);
  return `${parts.join("-")}.${extension}`;
};

const executeDownloadFile = async (
  url: string,
  filename: string,
  preloadedBuffer?: ArrayBuffer,
): Promise<void> => {
  try {
    incrementPaperEngagementCount();
    let buffer: ArrayBuffer;
    let blob: Blob;

    if (preloadedBuffer && preloadedBuffer.byteLength > 0) {
      buffer = preloadedBuffer;
      blob = new Blob([buffer], { type: "application/pdf" });
    } else {
      const response = await axios.get<Blob>(url, { responseType: "blob" });
      blob = response.data;
      buffer = await response.data.arrayBuffer();
    }

    try {
      const transformedBytes = await applyWatermarkAndDisclaimer(
        buffer,
        filename,
        url,
      );
      blob = new Blob([transformedBytes as BlobPart], {
        type: "application/pdf",
      });
    } catch (watermarkErr) {
      console.error(
        "Failed to apply watermark, falling back to original:",
        watermarkErr,
      );
    }

    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error("Download failed:", error);
    trackError("pdf_download_failed", {
      filename,
      error_message: error instanceof Error ? error.message : "Download failed",
    });
    throw error;
  }
};

export const downloadFile = async (
  url: string,
  filename: string,
  preloadedBuffer?: ArrayBuffer,
): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    requestDownloadWithFeedback(async () => {
      try {
        await executeDownloadFile(url, filename, preloadedBuffer);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
};