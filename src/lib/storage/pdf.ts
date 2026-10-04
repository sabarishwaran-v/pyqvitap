import { PDFDocument } from "pdf-lib";

const DEFAULT_PDF_SAVE_OPTIONS = {
  useObjectStreams: true,
  compress: true,
};

export async function compressPDF(pdfBytes: Uint8Array): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  return pdfDoc.save(DEFAULT_PDF_SAVE_OPTIONS);
}
