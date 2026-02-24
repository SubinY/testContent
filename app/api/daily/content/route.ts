import type { DailyContent } from "@/types";
import { readDailyContent } from "@/lib/daily-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function resolveToday(): string {
  return new Date().toISOString().split("T")[0];
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? resolveToday();
  const content = (await readDailyContent(date)) as DailyContent | null;

  return Response.json({
    date,
    content
  });
}
