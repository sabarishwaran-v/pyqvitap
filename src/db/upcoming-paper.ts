import mongoose, { Schema, type Model } from "mongoose";
import { type IUpcomingSubject } from "@/interface";

const upcomingSubjectSchema = new Schema<IUpcomingSubject>({
  subject: { type: String, required: true },
  slots: { type: [String], required: true },
});

const UpcomingSubject: Model<IUpcomingSubject> =
  mongoose.models.UpcomingSubject ??
  mongoose.model<IUpcomingSubject>("UpcomingSubject", upcomingSubjectSchema);

export default UpcomingSubject;
