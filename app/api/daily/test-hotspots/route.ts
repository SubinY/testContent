import { fetchDailyHotspots } from "@/lib/daily-hotspots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const sources = await fetchDailyHotspots();
    
    return Response.json({
      success: true,
      count: sources.length,
      sources: sources.map((source) => ({
        name: source.name,
        url: source.url,
        titlesCount: source.titles.length,
        titles: source.titles
      }))
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "未知错误",
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}



