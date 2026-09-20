import { PaperAdmin } from "@/db/papers";
import { createPDFfromImages, compressPDF } from "@/lib/storage/pdf";
import { uploadPDFToCloudinary, uploadThumbnailToCloudinary } from "@/lib/storage/cloudinary";
import { analyzePDFMetadata } from "@/lib/services/analyzer";
import { connectToDatabase } from "@/lib/database/mongoose";

const MAX_COMPRESSED_PDF_SIZE = 5 * 1024 * 1024; // 5MB compressed
const COMPRESS_THRESHOLD = 5 * 1024 * 1024; // 5MB

type UploadPaperInput = {
  files: File[];
  isPdf: boolean;
  thumbnail: File | null;
  campus: string | null;
};

type UploadPaperResult =
  | { success: true; file_url: string; thumbnail_url: string | null }
  | { success: false; message: string; status: number };

export async function uploadPaper({
  files,
  isPdf,
  thumbnail,
  campus,
}: UploadPaperInput): Promise<UploadPaperResult> {
  await connectToDatabase();
  
  let pdfBytes: Uint8Array;

  if (isPdf) {
    if (!files[0]) {
      return { success: false, message: "No PDF file provided.", status: 400 };
    }

    if (files[0].size > COMPRESS_THRESHOLD) {
      return {
        success: false,
        message: "PDF file exceeds the 5MB limit. Please select a PDF file under 5MB.",
        status: 400,
      };
    }

    const rawPdfBytes = new Uint8Array(await files[0].arrayBuffer());
    pdfBytes = await compressPDF(rawPdfBytes);
    if (pdfBytes.length > MAX_COMPRESSED_PDF_SIZE) {
      return {
        success: false,
        message: "PDF is too large after compression. The compressed file must be under 5MB.",
        status: 413,
      };
    }
  } else {
    pdfBytes = await createPDFfromImages(files);
    if (pdfBytes.length > MAX_COMPRESSED_PDF_SIZE) {
      return {
        success: false,
        message: "Generated PDF is too large after compression. Please upload fewer or smaller images.",
        status: 413,
      };
    }
  }

  const buffer = Buffer.from(pdfBytes);
  const file_url = await uploadPDFToCloudinary("unapproved", buffer);

  let thumbnail_url: string | null = null;
  if (thumbnail) {
    const thumbBuffer = Buffer.from(await thumbnail.arrayBuffer());
    thumbnail_url = await uploadThumbnailToCloudinary(thumbBuffer);
  }

  const paper = new PaperAdmin({
    file_url,
    thumbnail_url,
    campus: campus || "Andhra Pradesh",
    subject: null,
    slot: null,
    year: null,
    exam: null,
    semester: null,
    is_selected: false,
    ambiguous_tags: [],
  });
  await paper.save();

  // Asynchronously analyze PDF with Gemini AI and enrich metadata in the background
  const base64Pdf = buffer.toString("base64");
  void analyzePDFMetadata(base64Pdf)
    .then(async (analyzed) => {
      await connectToDatabase();
      const subjectFormatted = analyzed.course_name && analyzed.subject !== "UNKNOWN"
        ? `${analyzed.course_name.toUpperCase()} [${analyzed.subject.toUpperCase()}]`
        : analyzed.subject !== "UNKNOWN"
        ? analyzed.subject.toUpperCase()
        : null;

      await PaperAdmin.findByIdAndUpdate(paper._id, {
        subject: subjectFormatted,
        exam: analyzed.exam,
        slot: analyzed.slot,
        year: analyzed.year,
        ambiguous_tags: analyzed.ambiguous_tags,
      });
      console.log(`[AI Analyzer] Successfully analyzed and tagged uploaded paper ${paper._id}:`, analyzed);
    })
    .catch((err) => {
      console.error(`[AI Analyzer] Background analysis failed for paper ${paper._id}:`, err);
    });

  return { success: true, file_url, thumbnail_url };
}
