import { GoogleGenAI } from "@google/genai";

function getGenAI(): GoogleGenAI {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
}

export interface AnalyzedPaper {
  is_valid_exam_paper: boolean;
  course_code: string | null;
  course_title: string | null;
  exam: "CAT-1" | "CAT-2" | "FAT" | null;
  semester: string | null;
  year: string | null;
  slot: string | null;
  ambiguous_tags: string[];
}

const CANDIDATE_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash",
  "gemini-3.8-flash",
];

export async function analyzePDFMetadata(base64Pdf: string): Promise<AnalyzedPaper> {
  const prompt = `
You are a strict document analysis AI for university examination question papers.

STEP 1: FIRST EVALUATE DOCUMENT VALIDITY
Inspect the provided PDF document carefully:
Is this document an official, printed, or typed university examination paper (e.g. from VIT-AP / VIT or similar university with an exam question paper format containing university header, course details, questions, marks)?
If the document is ANY of the following:
- Handwritten study notes, cheatsheets, or personal summaries
- Lecture slides / presentation decks
- Syllabus document, course handout, or curriculum outline
- Homework assignment, tutorial sheet, or lab manual
- Textbook pages or published research papers
- Student resume/CV, certificate, ID card, or unrelated personal document
- Completely blurry, unreadable, blank, or spam
THEN set "is_valid_exam_paper": false.
When "is_valid_exam_paper" is false, DO NOT guess or infer random metadata. Return:
{
  "is_valid_exam_paper": false,
  "course_code": null,
  "course_title": null,
  "exam": null,
  "semester": null,
  "year": null,
  "slot": null,
  "tags": []
}

STEP 2: IF AND ONLY IF IT IS A VALID QUESTION PAPER:
Extract the following metadata accurately from the paper header:
1. course_code: The course code (e.g., CSE1001, CSE2001, MAT1001, MGT1040, ECE2001). Must be uppercase alphanumeric characters only, no spaces or special symbols (e.g. "CSE2001").
2. course_title: The exact full title of the course printed on the paper (e.g., "Data Structures and Algorithms", "Calculus for Engineers", "Entrepreneurship"). Do NOT include the code in this field.
3. exam: The specific exam category. Must be strictly one of: "CAT-1", "CAT-2", "FAT".
   - Continuous Assessment Test - 1 / CAT - 1 / CAT 1 => "CAT-1"
   - Continuous Assessment Test - 2 / CAT - 2 / CAT 2 => "CAT-2"
   - Final Assessment Test / FAT / Term End Examination / TEE => "FAT"
   If none of these are detected, return null.
4. semester: The semester name if printed on the paper (e.g., "Fall Semester", "Winter Semester", "Fall", "Winter", "Summer Semester", "Fall Freshers", "Winter Freshers"). If not mentioned, return null.
5. year: Academic year printed on the paper (e.g., "2024-25", "2023-24", "2023", "2024"). Return exactly as printed. If not found, return null.
6. slot: The slot code if printed on the paper (e.g. "A1", "A2", "B1", "B2", "C1", "D1", "E1", "F1", "G1", "TE1", etc.). If not found, return null.
7. tags: An array of 3 to 6 key academic topics or keywords covered in the questions (e.g. ["Binary Trees", "Dijkstra Algorithm", "Graph Traversal"]).

Return ONLY a valid JSON object matching this schema without markdown code blocks:
{
  "is_valid_exam_paper": true,
  "course_code": "STRING or null",
  "course_title": "STRING or null",
  "exam": "CAT-1 | CAT-2 | FAT | null",
  "semester": "STRING or null",
  "year": "STRING or null",
  "slot": "STRING or null",
  "tags": ["STRING"]
}
`;

  let lastError: unknown = null;
  const ai = getGenAI();

  for (const model of CANDIDATE_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { data: base64Pdf, mimeType: "application/pdf" } },
              { text: prompt },
            ],
          },
        ],
      });

      let text = response.text || "{}";
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();

      const data = JSON.parse(text);
      const isValid = Boolean(data.is_valid_exam_paper);

      if (!isValid) {
        return {
          is_valid_exam_paper: false,
          course_code: null,
          course_title: null,
          exam: null,
          semester: null,
          year: null,
          slot: null,
          ambiguous_tags: [],
        };
      }

      const validExams = ["CAT-1", "CAT-2", "FAT"] as const;
      const normalizedExam = validExams.includes(data.exam) ? (data.exam as "CAT-1" | "CAT-2" | "FAT") : null;

      const rawCode = typeof data.course_code === "string" ? data.course_code.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() : null;
      const rawTitle = typeof data.course_title === "string" ? data.course_title.trim() : null;
      const rawYear = typeof data.year === "string" ? data.year.trim() : null;
      const rawSemester = typeof data.semester === "string" ? data.semester.trim() : null;
      const rawSlot = typeof data.slot === "string" ? data.slot.trim().toUpperCase() : null;

      return {
        is_valid_exam_paper: true,
        course_code: rawCode && rawCode.length > 0 ? rawCode : null,
        course_title: rawTitle && rawTitle.length > 0 ? rawTitle : null,
        exam: normalizedExam,
        semester: rawSemester && rawSemester.length > 0 ? rawSemester : null,
        year: rawYear && rawYear.length > 0 ? rawYear : null,
        slot: rawSlot && rawSlot.length > 0 ? rawSlot : null,
        ambiguous_tags: Array.isArray(data.tags) ? data.tags.filter((t: unknown) => typeof t === "string") : [],
      };
    } catch (error) {
      lastError = error;
      console.warn(`[AI Analyzer] Attempt with model ${model} failed:`, error instanceof Error ? error.message : error);
    }
  }

  console.error("[AI Analyzer] All candidate models failed. Last error:", lastError);
  return {
    is_valid_exam_paper: false,
    course_code: null,
    course_title: null,
    exam: null,
    semester: null,
    year: null,
    slot: null,
    ambiguous_tags: [],
  };
}
