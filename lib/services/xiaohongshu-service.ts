import { logger } from "@/lib/logger";
import {
  contentPromptPath,
  loadContentPromptAndWordList,
  sanitizeCopyText
} from "@/lib/prompts/sensitive";
import { buildXiaohongshuSystemPrompt, buildXiaohongshuUserPrompt } from "@/lib/prompts/xiaohongshu";
import { shouldForceLocalByRunMode } from "@/lib/runmode";
import { UnifiedLlmClient } from "@/lib/llm/client";
import type { XiaohongshuGenerateParams, XiaohongshuGenerateResult } from "@/types";

interface ParsedCopyPayload {
  title?: unknown;
  body?: unknown;
  hashtags?: unknown;
}

function normalizeHashtag(tag: string): string {
  const value = tag.trim().replace(/\s+/g, "");
  if (!value) {
    return "";
  }
  return value.startsWith("#") ? value : `#${value}`;
}

function normalizeHashtags(input: unknown, fallback: string[]): string[] {
  const source = Array.isArray(input) ? input : fallback;
  const normalized = source
    .map((item) => normalizeHashtag(typeof item === "string" ? item : ""))
    .filter((item) => item.length > 1);
  const deduped = Array.from(new Set(normalized));
  if (deduped.length > 0) {
    return deduped.slice(0, 12);
  }
  return fallback.map(normalizeHashtag).filter((item) => item.length > 1).slice(0, 12);
}

function parseModelJson(raw: string): ParsedCopyPayload {
  const cleaned = raw.trim();
  if (!cleaned) {
    return {};
  }

  try {
    return JSON.parse(cleaned) as ParsedCopyPayload;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as ParsedCopyPayload;
      } catch {
        return {};
      }
    }
  }

  return {};
}

function buildFallbackCopy(params: XiaohongshuGenerateParams): XiaohongshuGenerateResult {
  const hashtags = normalizeHashtags(params.variant.hashtags, [`#${params.topic}`, "#心理测试", "#测评"]);
  const title = params.variant.headline?.trim() || `${params.topic}测评｜${params.variant.styleName ?? params.variant.label}`;
  const body = params.variant.description?.trim() || `围绕“${params.topic}”整理了一份测评内容，欢迎你也来试试。`;
  return {
    title,
    body,
    hashtags,
    source: "fallback",
    compliancePromptPath: contentPromptPath
  };
}

export async function generateXiaohongshuContent(params: XiaohongshuGenerateParams): Promise<XiaohongshuGenerateResult> {
  const start = Date.now();
  logger.info("xiaohongshu.generate.start", {
    topic: params.topic,
    provider: params.provider ?? "auto",
    variantLabel: params.variant.label
  });
  try {
    const fallback = buildFallbackCopy(params);
    if (shouldForceLocalByRunMode() || params.provider === "local") {
      return fallback;
    }

    const { contentPrompt, bannedWords } = await loadContentPromptAndWordList();
    const client = new UnifiedLlmClient({ preferredProvider: params.provider ?? "auto" });
    if (!client.hasRemoteProvider()) {
      return fallback;
    }
    const response = await client.generate({
      systemPrompt: buildXiaohongshuSystemPrompt(contentPrompt),
      userPrompt: buildXiaohongshuUserPrompt(params.topic, params.variant),
      timeoutMs: 90_000
    });
    const parsed = parseModelJson(response.content);
    const rawTitle = typeof parsed.title === "string" ? parsed.title.trim() : fallback.title;
    const rawBody = typeof parsed.body === "string" ? parsed.body.trim() : fallback.body;
    const title = sanitizeCopyText(rawTitle, bannedWords);
    const body = sanitizeCopyText(rawBody, bannedWords);
    const hashtags = normalizeHashtags(parsed.hashtags, fallback.hashtags);

    const result: XiaohongshuGenerateResult =
      title && body && hashtags.length > 0
        ? {
            title,
            body,
            hashtags,
            source: "remote",
            compliancePromptPath: contentPromptPath
          }
        : fallback;

    logger.info("xiaohongshu.generate.done", {
      topic: params.topic,
      source: result.source,
      durationMs: Date.now() - start
    });
    return result;
  } catch (error) {
    logger.error("xiaohongshu.generate.fail", {
      topic: params.topic,
      durationMs: Date.now() - start,
      error: error instanceof Error ? error.message : "unknown"
    });
    throw error;
  }
}
