import { verifyEmail } from "@devmehq/email-validator-js";
import { withDatabase } from "@/lib/database/mongoose";
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

  return await withDatabase(async () => {
    const existing = await EmailSub.findOne({ email: normalizedEmail }).lean();
    if (existing) {
      return { alreadySubscribed: true };
    }

    await EmailSub.create({ email: normalizedEmail });
    return { alreadySubscribed: false };
  });
}

export async function unsubscribeEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    throw new CustomError("Invalid email address", 400);
  }

  return await withDatabase(async () => {
    const result = await EmailSub.deleteOne({ email: normalizedEmail });
    return { success: true, deletedCount: result.deletedCount };
  });
}