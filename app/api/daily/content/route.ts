import { fail, ok } from "@/lib/services/api-response";
import { getDailyContentByDate } from "@/lib/services/daily-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function resolveToday(): string {
  return new Date().toISOString().split("T")[0];
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? resolveToday();
  try {
    const content = await getDailyContentByDate(date);
    return Response.json(ok({ date, content }));
  } catch (error) {
    return Response.json(
      fail("STORAGE_ERROR", error instanceof Error ? error.message : "读取每日推荐失败。"),
      { status: 500 }
    );
  }
}
