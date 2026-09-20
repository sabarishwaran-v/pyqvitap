import mongoose, { Schema, type Model } from "mongoose";
import { type IRelatedSubject } from "@/interface";
  

const relatedSubjectSchema = new Schema<IRelatedSubject>({
  subject: { type: String, required: true },
  related_subjects: { type: [String], required: true },
});

const RelatedSubject: Model<IRelatedSubject> =
  mongoose.models.RelatedSubject ??
  mongoose.model<IRelatedSubject>("RelatedSubject", relatedSubjectSchema);

export default RelatedSubject;
