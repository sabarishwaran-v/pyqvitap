/**
 * Browser-side first-page thumbnail generator for student uploads.
 * Extracts the first page of a PDF or scales the first image into a WebP thumbnail.
 */

export async function generateFirstPageThumbnail(
  file: File,
  isPdf: boolean
): Promise<File | null> {
  if (typeof window === "undefined") return null;

  try {
    if (isPdf) {
      return await renderPdfFirstPageToThumbnail(file);
    } else {
      return await renderImageToThumbnail(file);
    }
  } catch (err) {
    console.warn("[ThumbnailGenerator] Failed to generate thumbnail:", err);
    return null;
  }
}

async function renderImageToThumbnail(file: File): Promise<File | null> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new window.Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = objectUrl;
    });

    const targetWidth = 480;
    const originalWidth = img.naturalWidth || img.width || 480;
    const originalHeight = img.naturalHeight || img.height || 640;
    const scale = Math.min(1, targetWidth / originalWidth);
    const width = Math.max(1, Math.round(originalWidth * scale));
    const height = Math.max(1, Math.round(originalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", 0.85);
    });

    if (!blob) return null;
    return new File([blob], "thumbnail.webp", { type: "image/webp" });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function renderPdfFirstPageToThumbnail(file: File): Promise<File | null> {
  try {
    const pdfjs = await import("pdfjs-dist");
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.mjs";
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true,
      stopAtErrors: false,
    });

    const pdfDoc = await loadingTask.promise;
    if (pdfDoc.numPages < 1) return null;

    const page = await pdfDoc.getPage(1);
    const unscaledViewport = page.getViewport({ scale: 1 });
    const targetWidth = 480;
    const scale = targetWidth / Math.max(unscaledViewport.width, 1);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Fill white background before rendering PDF
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport: viewport,
    }).promise;

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", 0.85);
    });

    if (!blob) return null;
    return new File([blob], "thumbnail.webp", { type: "image/webp" });
  } catch (pdfErr) {
    console.warn("[ThumbnailGenerator] PDF render failed:", pdfErr);
    return null;
  }
}
