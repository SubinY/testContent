import { z } from "zod";

import { checkContentExists, readDailyContent, writeDailyContent } from "@/lib/daily-storage";
import { fetchDailyHotspots } from "@/lib/daily-hotspots";
import { UnifiedLlmClient, getPreferredProviderFromEnv } from "@/lib/llm/client";
import { buildDailyPrompts } from "@/lib/prompts/daily";
import { parseModelJson } from "@/lib/prompts";
import type { DailyContent } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  force: z.boolean().optional()
});

const responseSchema = z.object({
  shortTheme: z.string().min(4),
  fullContent: z.string().min(1)
});

function normalizeShortTheme(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 12) {
    return trimmed;
  }
  return trimmed.slice(0, 12);
}

export async function POST(request: Request): Promise<Response> {
  const payload = await request.json().catch(() => null);
  const parsedBody = requestSchema.safeParse(payload);

  if (!parsedBody.success) {
    return Response.json({ message: "请求参数不合法。" }, { status: 400 });
  }

  const { date, force } = parsedBody.data;
  if (!force && (await checkContentExists(date))) {
    const existing = (await readDailyContent(date)) as DailyContent | null;
    if (existing) {
      return Response.json(existing);
    }
  }

  try {
    const sources = await fetchDailyHotspots();
    if (sources.length === 0) {
      return Response.json(
        { message: "热点来源不可用，暂无法生成。请稍后重试。" },
        { status: 503 }
      );
    }
    const { systemPrompt, userPrompt } = await buildDailyPrompts(date, sources);
    console.log(systemPrompt, userPrompt, ' systemPrompt, userPrompt');
    const client = new UnifiedLlmClient({
      preferredProvider: getPreferredProviderFromEnv()
    });
    const response = await client.generate({
      systemPrompt,
      userPrompt,
      timeoutMs: 60_000
    });
    const parsed = parseModelJson(response.content);
    const validated = responseSchema.safeParse(parsed);

    if (!validated.success) {
      return Response.json(
        {
          message: "生成内容解析失败。",
          details: validated.error.flatten()
        },
        { status: 500 }
      );
    }

    const content: DailyContent = {
      date,
      shortTheme: normalizeShortTheme(validated.data.shortTheme),
      fullContent: validated.data.fullContent.trim(),
      sources,
      generatedAt: new Date().toISOString()
    };
    await writeDailyContent(date, content);
    return Response.json(content);
  } catch (error) {
    return Response.json(
      {
        message: error instanceof Error ? error.message : "生成失败，请稍后重试。"
      },
      { status: 500 }
    );
  }
}
