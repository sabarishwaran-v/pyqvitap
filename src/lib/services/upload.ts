import StudentPaper from "@/db/studentPaper";
import { Course } from "@/db/course";
import { compressPDF } from "@/lib/storage/pdf";
import { getStorageService } from "@/lib/storage";
import { analyzePDFMetadata } from "@/lib/services/analyzer";
import { withDatabase } from "@/lib/database/mongoose";
import { escapeRegExp } from "@/lib/utils/regex";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const MAX_COMPRESSED_PDF_SIZE = 5 * 1024 * 1024; // 5MB compressed
const COMPRESS_THRESHOLD = 5 * 1024 * 1024; // 5MB
const CANONICAL_CAMPUS = "Andhra Pradesh"; // PyqVitAp is strictly for Andhra Pradesh campus

type UploadPaperInput = {
  files: File[];
  isPdf: boolean;
  thumbnail: File | null;
  campus: string | null;
};

type UploadPaperResult =
  | { success: true; file_url: string; thumbnail_url: string | null }
  | { success: false; message: string; status: number };

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function areTitlesMatching(titleA: string, titleB: string): boolean {
  const normA = normalizeTitle(titleA);
  const normB = normalizeTitle(titleB);
  if (!normA || !normB) return false;
  if (normA === normB) return true;
  if (normA.includes(normB) || normB.includes(normA)) return true;

  const stopWords = new Set(["and", "of", "the", "for", "in", "to", "a", "an", "with"]);
  const stem = (w: string) => (w.endsWith("s") ? w.slice(0, -1) : w);
  const wordsA = normA.split(" ").filter((w) => w && !stopWords.has(w)).map(stem);
  const wordsB = normB.split(" ").filter((w) => w && !stopWords.has(w)).map(stem);

  if (wordsA.length === 0 || wordsB.length === 0) return false;

  const setB = new Set(wordsB);
  const intersection = wordsA.filter((w) => setB.has(w));
  const similarity = (2 * intersection.length) / (wordsA.length + wordsB.length);
  return similarity >= 0.7;
}

export async function uploadPaper({
  files,
  thumbnail,
  campus,
}: UploadPaperInput): Promise<UploadPaperResult> {
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
  const pdfBytes = await compressPDF(rawPdfBytes);
  if (pdfBytes.length > MAX_COMPRESSED_PDF_SIZE) {
    return {
      success: false,
      message: "PDF is too large after compression. The compressed file must be under 5MB.",
      status: 413,
    };
  }

  const buffer = Buffer.from(pdfBytes);
  const storage = getStorageService();
  const pdfUpload = await storage.uploadPDF("unapproved", buffer);
  const file_url = pdfUpload.url;

  let thumbnail_url: string | null = null;
  if (thumbnail) {
    const thumbBuffer = Buffer.from(await thumbnail.arrayBuffer());
    const thumbUpload = await storage.uploadThumbnail(thumbBuffer);
    thumbnail_url = thumbUpload.url;
  }

  // Create student paper document in student_papers collection (isolated from official papers)
  const paper = await withDatabase(async () => {
    return await StudentPaper.create({
      file_url,
      thumbnail_url: thumbnail_url || "",
      production: false,
      review_status: "PENDING_AI",
      matching: {
        is_valid_exam_paper: false,
        course_code_matched: false,
        course_title_matched: false,
        exam_valid: false,
        semester_valid: false,
      },
      metadata: {
        course_code: null,
        course_title: null,
        exam: null,
        slot: null,
        year: null,
        semester: null,
        campus: CANONICAL_CAMPUS,
        ambiguous_tags: [],
      },
      subject: null,
      exam: null,
      slot: "",
      year: null,
      semester: null,
      campus: CANONICAL_CAMPUS,
      uploaded_at: new Date(),
    });
  });

  // Asynchronously analyze PDF with Gemini AI and validate against existing courses (read-only)
  const base64Pdf = buffer.toString("base64");
  const backgroundTask = analyzePDFMetadata(base64Pdf)
    .then(async (analyzed) => {
      await withDatabase(async () => {
        if (!analyzed.is_valid_exam_paper) {
          await StudentPaper.findByIdAndUpdate(paper._id, {
            review_status: "NOT_ABLE_TO_REVIEW",
            matching: {
              is_valid_exam_paper: false,
              course_code_matched: false,
              course_title_matched: false,
              exam_valid: false,
              semester_valid: false,
            },
            metadata: {
              course_code: null,
              course_title: null,
              exam: null,
              slot: null,
              year: null,
              semester: null,
              campus: CANONICAL_CAMPUS,
              ambiguous_tags: [],
            },
            subject: null,
          });
          console.log(`[AI Analyzer] Paper ${paper._id} marked as NOT_ABLE_TO_REVIEW (invalid exam paper).`);
          return;
        }

        // Search existing courses in DB (strictly READ-ONLY; never create or alter courses)
        let matchedCourse = null;
        let course_code_matched = false;
        let course_title_matched = false;

        if (analyzed.course_code) {
          const escapedCode = escapeRegExp(analyzed.course_code);
          matchedCourse = await Course.findOne({
            name: { $regex: new RegExp(`\\[${escapedCode}\\]`, "i") },
          }).lean();
          course_code_matched = Boolean(matchedCourse);
        }

        if (matchedCourse && analyzed.course_title) {
          const canonicalTitle = matchedCourse.name.replace(/\[.*?\]/, "").trim();
          course_title_matched = areTitlesMatching(canonicalTitle, analyzed.course_title);
        }

        const exam_valid = Boolean(analyzed.exam && ["CAT-1", "CAT-2", "FAT"].includes(analyzed.exam));
        const validSemesters = [
          "fall",
          "winter",
          "summer",
          "long summer",
          "intra sem",
          "fall semester",
          "winter semester",
          "summer semester",
          "weekend semester",
          "fall freshers",
          "winter freshers",
          "fast track fall",
        ];
        const semester_valid = Boolean(
          analyzed.semester && validSemesters.some((s) => analyzed.semester!.toLowerCase().includes(s))
        );

        const isFullyMatched = course_code_matched && course_title_matched && exam_valid;
        const review_status = isFullyMatched ? "MATCHED" : "MISMATCH";

        // If course code matched existing course in DB, assign canonical subject; else keep unlinked
        const canonicalSubject = matchedCourse
          ? matchedCourse.name
          : analyzed.course_title && analyzed.course_code
          ? `${analyzed.course_title.toUpperCase()} [${analyzed.course_code.toUpperCase()}]`
          : analyzed.course_code || analyzed.course_title || null;

        await StudentPaper.findByIdAndUpdate(paper._id, {
          review_status,
          matching: {
            is_valid_exam_paper: true,
            course_code_matched,
            course_title_matched,
            exam_valid,
            semester_valid,
          },
          metadata: {
            course_code: analyzed.course_code,
            course_title: analyzed.course_title,
            exam: analyzed.exam,
            slot: analyzed.slot,
            year: analyzed.year,
            semester: analyzed.semester,
            campus: CANONICAL_CAMPUS,
            ambiguous_tags: analyzed.ambiguous_tags,
          },
          subject: canonicalSubject,
          exam: analyzed.exam,
          slot: analyzed.slot || "",
          year: analyzed.year,
          semester: analyzed.semester,
        });

        console.log(
          `[AI Analyzer] Processed paper ${paper._id}: status=${review_status}, code_match=${course_code_matched}, title_match=${course_title_matched}, subject="${canonicalSubject}"`
        );
      });
    })
    .catch((err) => {
      console.error(`[AI Analyzer] Background analysis failed for paper ${paper._id}:`, err);
    });

  let cfCtx: ReturnType<typeof getCloudflareContext> | undefined;
  try {
    cfCtx = getCloudflareContext();
  } catch {
    // In local development or contexts where Cloudflare global state is not initialized
  }

  const executionCtx = cfCtx?.ctx as { waitUntil?: (promise: Promise<unknown>) => void } | undefined;
  if (typeof executionCtx?.waitUntil === "function") {
    executionCtx.waitUntil(backgroundTask);
  } else {
    console.warn(`[AI Analyzer] Cloudflare execution context unavailable; background task running detached for paper ${paper._id}`);
  }

  return { success: true, file_url, thumbnail_url };
}
