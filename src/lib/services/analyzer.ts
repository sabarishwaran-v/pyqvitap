import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface AnalyzedPaper {
  subject: string;
  course_name: string;
  year: string;
  exam: "CAT-1" | "CAT-2" | "FAT" | null;
  slot: string | null;
  ambiguous_tags: string[];
}

export async function analyzePDFMetadata(base64Pdf: string): Promise<AnalyzedPaper> {
  const prompt = `
  You are an AI assistant analyzing university exam papers for VIT-AP.
  Extract the following metadata from the provided PDF:
  1. subject: The course code (e.g., CSE1001, MAT2002). Must be uppercase without spaces. Look for "Course Code".
  2. course_name: The full title of the course (e.g., "Software Engineering", "Mathematics"). Look closely for "Course Title" or similar in the table header.
  3. year: The year the exam took place (e.g., 2023 or 2025-26). Return the year exactly as written.
  4. exam: The type of exam. Must be exactly one of: "CAT-1", "CAT-2", "FAT". (If you see Continuous Assessment Test-1, it is CAT-1).
  5. slot: The exam slot (e.g., A1, B1, TE1, etc). Look for "Slot". If not found, return null.
  6. tags: An array of 3 to 6 specific syllabus topics or keywords found in the exam questions (e.g., ["Machine Learning", "Neural Networks", "Gradient Descent"]). This helps students search for papers by topic.

  Return ONLY a valid JSON object matching this schema. Do not return markdown, do not return anything else.
  {
    "subject": "STRING",
    "course_name": "STRING",
    "year": "STRING",
    "exam": "STRING",
    "slot": "STRING",
    "tags": ["STRING"]
  }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { data: base64Pdf, mimeType: "application/pdf" } },
            { text: prompt }
          ]
        }
      ]
    });

    let text = response.text || "{}";
    // Clean up markdown code blocks if any
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const data = JSON.parse(text);
    return {
      subject: data.subject?.toUpperCase() || "UNKNOWN",
      course_name: data.course_name || "",
      year: data.year || new Date().getFullYear().toString(),
      exam: ["CAT-1", "CAT-2", "FAT"].includes(data.exam) ? data.exam : null,
      slot: data.slot || null,
      ambiguous_tags: Array.isArray(data.tags) ? data.tags : [],
    };
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return {
      subject: "UNKNOWN",
      course_name: "",
      year: new Date().getFullYear().toString(),
      exam: null,
      slot: null,
      ambiguous_tags: [],
    };
  }
}
