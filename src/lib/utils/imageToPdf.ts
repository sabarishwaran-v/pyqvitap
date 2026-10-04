import { PDFDocument } from "pdf-lib";

const MAX_IMAGE_DIMENSION = 1600;
const JPEG_QUALITY = 0.72;

/**
 * Converts an array of image files to a single compressed PDF in the browser.
 * Processes images sequentially to minimize memory usage on mobile devices.
 */
export async function convertImagesToPdf(files: File[]): Promise<File> {
  if (files.length === 0) {
    throw new Error("No image files provided for conversion.");
  }

  const pdfDoc = await PDFDocument.create();

  for (const file of files) {
    const objectUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new window.Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`Failed to load image: ${file.name}`));
        image.src = objectUrl;
      });

      const originalWidth = img.naturalWidth || img.width;
      const originalHeight = img.naturalHeight || img.height;
      const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(originalWidth, originalHeight));
      const width = Math.max(1, Math.round(originalWidth * scale));
      const height = Math.max(1, Math.round(originalHeight * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Unable to create canvas rendering context");
      }

      ctx.drawImage(img, 0, 0, width, height);

      const jpegBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error(`Failed to encode image: ${file.name}`));
            }
          },
          "image/jpeg",
          JPEG_QUALITY
        );
      });

      // Explicitly release canvas buffer memory
      canvas.width = 0;
      canvas.height = 0;

      const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());
      const embeddedJpg = await pdfDoc.embedJpg(jpegBytes);
      const page = pdfDoc.addPage([embeddedJpg.width, embeddedJpg.height]);
      page.drawImage(embeddedJpg, {
        x: 0,
        y: 0,
        width: embeddedJpg.width,
        height: embeddedJpg.height,
      });
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  const pdfBytes = await pdfDoc.save({
    useObjectStreams: true,
  });

  return new File([pdfBytes as unknown as BlobPart], "document.pdf", {
    type: "application/pdf",
  });
}
