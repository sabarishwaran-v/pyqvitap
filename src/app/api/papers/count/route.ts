import { getCourseCounts } from "@/lib/services/paper";
import { success, failure } from "@/lib/utils/response";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const courseCount = await getCourseCounts();

    return success(courseCount, "OK", 200, {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    });
  } catch (error) {
    console.error(error);
    return failure("Failed to fetch course counts", 500);
  }
}
