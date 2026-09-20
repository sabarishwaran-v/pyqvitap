import mongoose, { Schema, type Model } from "mongoose";

const emailSchema = new Schema({
  email: { type: String, required: true, unique: true },
  subscribedAt: { type: Date, default: Date.now },
});

export const EmailSub: Model<any> =
  mongoose.models.EmailSub ?? mongoose.model("EmailSub", emailSchema);
