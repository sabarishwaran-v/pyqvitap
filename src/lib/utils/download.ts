import { type IPaper } from "../../interface";
import { extractBracketContent } from "./string";
import axios from "axios";
import { applyWatermarkAndDisclaimer } from "./pdfWatermark";

export const getSecureUrl = (url: string): string =>
  url.startsWith("http://") ? url.replace("http://", "https://") : url;

export const generateFileName = (paper: IPaper): string => {
  const extension = paper.file_url.split(".").pop();
  const subjectCode = extractBracketContent(paper.subject);
  const slot = paper.slot?.trim();
  const parts = [subjectCode, paper.exam, slot, paper.year].filter(Boolean);
  return `${parts.join("-")}.${extension}`;
};

export const downloadFile = async (
  url: string,
  filename: string,
): Promise<void> => {
  try {
    const response = await axios.get(url, { responseType: "blob" });
    let blob = new Blob([response.data]);

    try {
      const buffer = await response.data.arrayBuffer();
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
  }
};