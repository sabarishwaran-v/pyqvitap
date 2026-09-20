import type { PaperResponse } from "@/interface";
import { getPaperById } from "@/lib/services/paper";
import { Types } from "mongoose";

export const fetchPaperID = async (id: string): Promise<PaperResponse> => {
  if (!id || !Types.ObjectId.isValid(id)) {
    throw new Error("Paper not found");
  }

  const paper = await getPaperById(id);
  if (!paper) {
    throw new Error("Paper not found");
  }

  return {
    file_url: paper.file_url,
    subject: paper.subject ?? "",
    year: paper.year ?? "",
    slot: paper.slot ?? "",
    exam: paper.exam ?? "",
    semester: paper.semester ?? "",
    school: paper.school,
    pdf_sha256: paper.pdf_sha256,
  };
};
