import { Schema, type Model } from "mongoose";
import { getModel } from "@/lib/database/mongoose";

const emailSchema = new Schema({
  email: { type: String, required: true, unique: true },
  subscribedAt: { type: Date, default: Date.now },
  welcomeEmailSentAt: { type: Date, default: null },
});

export const EmailSub: Model<any> = getModel("EmailSub", emailSchema);
