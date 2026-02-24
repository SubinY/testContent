import { checkContentExists, readDailyContent, writeDailyContent } from "@/lib/daily-storage";
import { fetchDailyHotspots } from "@/lib/daily-hotspots";
import { UnifiedLlmClient, getPreferredProviderFromEnv } from "@/lib/llm/client";
import { logger } from "@/lib/logger";
import { parseModelJson } from "@/lib/prompts";
import { buildDailyPrompts } from "@/lib/prompts/daily";
import type { DailyContent, DailySource } from "@/types";

interface GenerateDailyContentParams {
  date: string;
  force?: boolean;
}

interface GenerateDailyContentResult {
  reused: boolean;
  content: DailyContent;
}

function normalizeShortTheme(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 12) {
    return trimmed;
  }
  return trimmed.slice(0, 12);
}

function isValidGeneratedPayload(value: unknown): value is { shortTheme: string; fullContent: string } {
  if (!value || typeof value !== "object") {
    return false;
  }
  const data = value as { shortTheme?: unknown; fullContent?: unknown };
  return (
    typeof data.shortTheme === "string" &&
    data.shortTheme.trim().length >= 4 &&
    typeof data.fullContent === "string" &&
    data.fullContent.trim().length > 0
  );
}

export async function getDailyContentByDate(date: string): Promise<DailyContent | null> {
  const start = Date.now();
  logger.info("daily.get.start", { date });
  const content = (await readDailyContent(date)) as DailyContent | null;
  logger.info("daily.get.done", { date, hit: Boolean(content), durationMs: Date.now() - start });
  return content;
}

export async function getDailyHotspotsOverview(): Promise<DailySource[]> {
  const start = Date.now();
  logger.info("daily.hotspots.start");
  try {
    const sources = await fetchDailyHotspots();
    logger.info("daily.hotspots.done", { count: sources.length, durationMs: Date.now() - start });
    return sources;
  } catch (error) {
    logger.error("daily.hotspots.fail", {
      durationMs: Date.now() - start,
      error: error instanceof Error ? error.message : "unknown"
    });
    throw error;
  }
}

export async function generateDailyContent(params: GenerateDailyContentParams): Promise<GenerateDailyContentResult> {
  const { date, force = false } = params;
  const start = Date.now();
  logger.info("daily.generate.start", { date, force });
  try {
    if (!force && (await checkContentExists(date))) {
      const existing = (await readDailyContent(date)) as DailyContent | null;
      if (existing) {
        logger.info("daily.generate.reuse", { date, durationMs: Date.now() - start });
        return {
          reused: true,
          content: existing
        };
      }
    }

    const sources = await fetchDailyHotspots();
    if (sources.length === 0) {
      throw new Error("热点来源不可用，暂无法生成。请稍后重试。");
    }

    const { systemPrompt, userPrompt } = await buildDailyPrompts(date, sources);
    const client = new UnifiedLlmClient({
      preferredProvider: getPreferredProviderFromEnv()
    });
    const response = await client.generate({
      systemPrompt,
      userPrompt,
      timeoutMs: 60_000
    });
    const parsed = parseModelJson(response.content);
    if (!isValidGeneratedPayload(parsed)) {
      throw new Error("生成内容解析失败。");
    }

    const content: DailyContent = {
      date,
      shortTheme: normalizeShortTheme(parsed.shortTheme),
      fullContent: parsed.fullContent.trim(),
      sources,
      generatedAt: new Date().toISOString()
    };
    await writeDailyContent(date, content);

    logger.info("daily.generate.done", { date, reused: false, durationMs: Date.now() - start });
    return {
      reused: false,
      content
    };
  } catch (error) {
    logger.error("daily.generate.fail", {
      date,
      durationMs: Date.now() - start,
      error: error instanceof Error ? error.message : "unknown"
    });
    throw error;
  }
}
