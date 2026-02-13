import { z } from "zod";

import { generateXiaohongshuCopy } from "@/lib/prompts/xiaohongshu";

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
    return Response.json({ message: "请求参数不合法。" }, { status: 400 });
  }

  const result = await generateXiaohongshuCopy({
    topic: parsed.data.topic,
    variant: parsed.data.variant,
    preferredProvider: parsed.data.provider ?? "auto"
  });

  return Response.json({ result });
}
