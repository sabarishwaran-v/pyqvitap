import { verifyEmail } from "@devmehq/email-validator-js";
import { connectToDatabase } from "@/lib/database/mongoose";
import { EmailSub } from "@/db/email";
import { CustomError } from "@/lib/utils/error";

export async function subscribeEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const result = await verifyEmail({
    emailAddress: normalizedEmail,
    verifyMx: true,
    verifySmtp: false,
    timeout: 4000,
  });

  if (!result.validFormat) {
    throw new CustomError("Invalid email format", 400);
  }

  if (!result.validMx) {
    throw new CustomError("Email domain is invalid", 400);
  }

  await connectToDatabase();

  const existing = await EmailSub.findOne({ email: normalizedEmail });
  if (existing) {
    return { alreadySubscribed: true };
  }

  await EmailSub.create({ email: normalizedEmail });
  return { alreadySubscribed: false };
}