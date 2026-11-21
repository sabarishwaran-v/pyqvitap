import { GoogleGenAI } from "@google/genai";
import {
  isValidSlot,
  normalizeSlot,
  type AuthoritativeSlot,
} from "@/lib/constants/slots";
import { getMediaGatewayUrl } from "@/lib/utils/media";

const CANDIDATE_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash",
  "gemini-3.8-flash",
];

function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

const SLOT_PROMPT = `You are an expert document inspector for VIT-AP examination question papers.
Look at the printed and handwritten examination header table on page 1 of this PDF:
- Find the "Slot:" box/field in the table (usually adjacent to Date, Set No, or Session).
- Read the handwritten or printed slot code. Allowed slots are: A1, A2, B1, B2, C1, C2, D1, D2, E1, E2, F1, F2, G1, G2.
Return ONLY valid JSON matching: {"slot": "SLOT_CODE"} (for example {"slot": "B2"}), or {"slot": null} if unreadable, blank, or not an authoritative slot.`;

/**
 * Inspects a question paper PDF in base64 format and returns the detected slot using Gemini AI.
 */
export async function detectSlotFromBase64Pdf(
  base64Pdf: string
): Promise<AuthoritativeSlot | null> {
  const ai = getGenAI();
  if (!ai || !base64Pdf) return null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { data: base64Pdf, mimeType: "application/pdf" } },
              { text: SLOT_PROMPT },
            ],
          },
        ],
      });

      let text = response.text || "{}";
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();

      const parsed = JSON.parse(text) as { slot?: unknown };
      if (parsed && typeof parsed.slot === "string") {
        const cleaned = parsed.slot.trim().toUpperCase();
        if (isValidSlot(cleaned)) {
          return normalizeSlot(cleaned);
        }
      }
    } catch (err) {
      console.warn(`[SlotAI] Attempt with model ${model} failed:`, err);
    }
  }

  return null;
}

/**
 * Fetches paper PDF by file_url or storage key, and detects slot using Gemini AI.
 */
export async function detectSlotFromUrl(
  fileUrl: string
): Promise<AuthoritativeSlot | null> {
  if (!fileUrl) return null;

  try {
    // Resolve URL (handles Cloudinary URL, relative key, or internal gateway)
    let fetchUrl = fileUrl;
    if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
      fetchUrl = fileUrl;
    } else {
      const gatewayPath = getMediaGatewayUrl(fileUrl);
      const origin =
        process.env.NEXT_PUBLIC_APP_URL || "https://pyqvitap.site";
      fetchUrl = `${origin.replace(/\/$/, "")}${gatewayPath}`;
    }

    // Direct proxy fallback for internal media keys:
    if (!fetchUrl.startsWith("http")) {
      fetchUrl = `https://pyqvitap.site/api/media/${fileUrl.replace(/^\//, "")}`;
    }

    const res = await fetch(fetchUrl);
    if (!res.ok) {
      console.warn(`[SlotAI] Failed to fetch PDF from ${fetchUrl}, status: ${res.status}`);
      return null;
    }

    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return await detectSlotFromBase64Pdf(base64);
  } catch (err) {
    console.error("[SlotAI] Error during detectSlotFromUrl:", err);
    return null;
  }
}
