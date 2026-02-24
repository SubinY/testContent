import { fail, ok } from "@/lib/services/api-response";
import { getDailyHotspotsOverview } from "@/lib/services/daily-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const sources = await getDailyHotspotsOverview();
    return Response.json(
      ok({
        count: sources.length,
        sources: sources.map((source) => ({
          name: source.name,
          url: source.url,
          titlesCount: source.titles.length,
          titles: source.titles
        }))
      })
    );
  } catch (error) {
    return Response.json(
      fail("UNKNOWN_ERROR", error instanceof Error ? error.message : "未知错误"),
      { status: 500 }
    );
  }
}
