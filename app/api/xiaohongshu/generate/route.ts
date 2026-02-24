import { z } from "zod";

import { fail, ok } from "@/lib/services/api-response";
import { generateXiaohongshuContent } from "@/lib/services/xiaohongshu-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  topic: z.string().trim().min(2).max(120),
  provider: z.enum(["auto", "openai", "deepseek", "modelgate", "local"]).optional(),
  variant: z.object({
    headline: z.string().optional(),
    description: z.string().optional(),
    coverTitle: z.string().optional(),
    coverSubtitle: z.string().optional(),
    styleName: z.string().optional(),
    label: z.string(),
    hashtags: z.array(z.string()).default([]),
    questions: z.array(z.object({ title: z.string() })).default([]),
    results: z.array(z.object({ title: z.string(), description: z.string() })).default([])
  })
});

export async function POST(request: Request): Promise<Response> {
  const payload = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(fail("INVALID_PARAMS", "请求参数不合法。"), { status: 400 });
  }

  try {
    const result = await generateXiaohongshuContent({
      topic: parsed.data.topic,
      variant: parsed.data.variant,
      provider: parsed.data.provider
    });
    return Response.json(ok(result));
  } catch (error) {
    return Response.json(
      fail("LLM_ERROR", error instanceof Error ? error.message : "文案生成失败。"),
      { status: 500 }
    );
  }
}
