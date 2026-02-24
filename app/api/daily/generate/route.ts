import { z } from "zod";

import { fail, ok } from "@/lib/services/api-response";
import { generateDailyContent } from "@/lib/services/daily-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  force: z.boolean().optional()
});

export async function POST(request: Request): Promise<Response> {
  const payload = await request.json().catch(() => null);
  const parsedBody = requestSchema.safeParse(payload);

  if (!parsedBody.success) {
    return Response.json(fail("INVALID_PARAMS", "请求参数不合法。"), { status: 400 });
  }

  try {
    const { content } = await generateDailyContent(parsedBody.data);
    return Response.json(ok(content));
  } catch (error) {
    const message = error instanceof Error ? error.message : "生成失败，请稍后重试。";
    const isHotspotUnavailable = message.includes("热点来源不可用");
    return Response.json(
      fail(isHotspotUnavailable ? "LLM_ERROR" : "UNKNOWN_ERROR", message),
      { status: isHotspotUnavailable ? 503 : 500 }
    );
  }
}
