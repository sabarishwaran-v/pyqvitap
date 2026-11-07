import { unsubscribeEmail } from "@/lib/services/subscribe";
import { success, failure } from "@/lib/utils/response";
import { customErrorHandler } from "@/lib/utils/error";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return failure("Email query parameter is required", 400);
    }

    await unsubscribeEmail(email);

    return success({
      message: "You have been successfully unsubscribed from PyqVitAp updates.",
    });
  } catch (error) {
    console.error("Error unsubscribing email:", error);
    return customErrorHandler(error, "Failed to unsubscribe");
  }
}

export async function POST(req: Request) {
  try {
    const { email } = (await req.json()) as { email: string };

    if (!email) {
      return failure("Email is required", 400);
    }

    await unsubscribeEmail(email);

    return success({
      message: "You have been successfully unsubscribed from PyqVitAp updates.",
    });
  } catch (error) {
    console.error("Error unsubscribing email:", error);
    return customErrorHandler(error, "Failed to unsubscribe");
  }
}
