import mongoose, { Schema, type Model } from "mongoose";
import { type IPaper, type IAdminPaper } from "@/interface";

const adminSchema = new Schema<IAdminPaper>({
  file_url: { type: String, required: true },
  thumbnail_url: { type: String, required: false },
  subject: { type: String || null, index: true },
  slot: { type: String || null, default: "" },
  year: { type: String || null },
  exam: {
    type: String || null,
    enum: ["CAT", "CAT-1", "CAT-2", "FAT", "Model CAT-1", "Model CAT-2", "Model FAT"],
  },
  semester: {
    type: String || null,
    enum: [
      "FALL",
      "WINTER",
      "FALL FRESHERS",
      "LONG SUMMER",
      "SUMMER - 1",
      "SUMMER - 2",
      "FAST TRACK FALL",
      "SUMMER",
      "WINTER FRESHERS",
      "INTRA SEM",
      "Fall Semester",
      "Fall Sem Freshers",
      "Winter Semester",
      "Summer Semester",
      "Weekend Semester",
    ],
  },
  campus: {
    type: String || null,
    enum: [
      "Vellore",
      "Chennai",
      "Andhra Pradesh",
      "Bhopal",
      "Bangalore",
      "Mauritius",
    ],
  },
  school: {
    type: String || null,
    enum: ["SCOPE", "SITE", "SENSE", "SMEC", "SCE", "SELECT", "SAS", "SSL", "VITBS", "SBST","SCORE"],
  },
  pdf_sha256: { type: String || null, required: false },
  answer_key_included: { type: Boolean || null, default: false },
  is_selected: { type: Boolean, default: false },
  ambiguous_tags: { type: [String], default: [] },
});

const paperSchema = new Schema<IPaper>({
  file_url: { type: String, required: true },
  thumbnail_url: { type: String, required: true },
  subject: { type: String, required: true, index: true },
  slot: { type: String, default: "" },
  year: { type: String, required: true },
  exam: {
    type: String,
    enum: ["CAT", "CAT-1", "CAT-2", "FAT", "Model CAT-1", "Model CAT-2", "Model FAT"],
    required: true,
  },
  semester: {
    type: String,
    enum: [
      "FALL",
      "WINTER",
      "FALL FRESHERS",
      "LONG SUMMER",
      "SUMMER - 1",
      "SUMMER - 2",
      "FAST TRACK FALL",
      "SUMMER",
      "WINTER FRESHERS",
      "INTRA SEM",
      "Fall Semester",
      "Fall Sem Freshers",
      "Winter Semester",
      "Summer Semester",
      "Weekend Semester",
    ],
    required: true,
  },
  campus: {
    type: String,
    enum: [
      "Vellore",
      "Chennai",
      "Andhra Pradesh",
      "Bhopal",
      "Bangalore",
      "Mauritius",
    ],
    required: true,
  },
  school: {
    type: String,
    enum: ["SCOPE","SITE","SENSE","SMEC","SCE","SELECT","SAS","SSL","VITBS","SBST","SCORE","SCHEME","SHINE","V-SIGN","V-SMART","V-SPARC","VAIAL","HOT"],
  },
  pdf_sha256: { type: String, required: false },
  answer_key_included: { type: Boolean, default: false },
});

export const PaperAdmin: Model<IAdminPaper> =
  mongoose.models.Admin ?? mongoose.model<IAdminPaper>("Admin", adminSchema, "admins");
const Paper: Model<IPaper> =
  mongoose.models.Paper ?? mongoose.model<IPaper>("Paper", paperSchema, "papers");

export default Paper;
