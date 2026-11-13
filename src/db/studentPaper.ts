import { Schema, type Model } from "mongoose";
import { type IStudentPaper } from "@/interface";
import { getModel } from "@/lib/database/mongoose";

const studentPaperSchema = new Schema<IStudentPaper>(
  {
    file_url: { type: String, required: true },
    thumbnail_url: { type: String, default: "" },
    production: { type: Boolean, default: false, index: true },
    review_status: {
      type: String,
      enum: ["PENDING_AI", "MATCHED", "MISMATCH", "NOT_ABLE_TO_REVIEW"],
      default: "PENDING_AI",
      index: true,
    },
    matching: {
      is_valid_exam_paper: { type: Boolean, default: false },
      course_code_matched: { type: Boolean, default: false },
      course_title_matched: { type: Boolean, default: false },
      exam_valid: { type: Boolean, default: false },
      semester_valid: { type: Boolean, default: false },
    },
    metadata: {
      course_code: { type: String, default: null },
      course_title: { type: String, default: null },
      exam: { type: String, default: null },
      slot: { type: String, default: null },
      year: { type: String, default: null },
      semester: { type: String, default: null },
      campus: { type: String, default: "Andhra Pradesh" },
      ambiguous_tags: { type: [String], default: [] },
    },
    subject: { type: String, default: null, index: true },
    exam: { type: String, default: null },
    slot: { type: String, default: "" },
    year: { type: String, default: null },
    semester: { type: String, default: null },
    campus: { type: String, default: "Andhra Pradesh" },
    uploaded_at: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

export const StudentPaper: Model<IStudentPaper> = getModel<IStudentPaper>(
  "StudentPaper",
  studentPaperSchema,
  "student_papers"
);

export default StudentPaper;
