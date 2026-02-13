import { UnifiedLlmClient } from "@/lib/llm/client";
import { contentPromptPath, loadContentPromptAndWordList, sanitizeCopyText } from "@/lib/prompts/sensitive";
import { shouldForceLocalByRunMode } from "@/lib/runmode";
import type { LlmProviderSelection } from "@/types";

export interface XiaohongshuCopyResult {
  title: string;
  body: string;
  hashtags: string[];
  source: "remote" | "fallback";
  compliancePromptPath: string;
}

type ExportVariantInput = {
  headline?: string;
  description?: string;
  coverTitle?: string;
  coverSubtitle?: string;
  styleName?: string;
  label: string;
  hashtags: string[];
  questions: Array<{ title: string }>;
  results: Array<{ title: string; description: string }>;
};

interface GenerateXiaohongshuCopyParams {
  topic: string;
  variant: ExportVariantInput;
  preferredProvider?: LlmProviderSelection;
}

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

function buildFallbackCopy(topic: string, variant: ExportVariantInput): XiaohongshuCopyResult {
  const hashtags = normalizeHashtags(variant.hashtags, [`#${topic}`, "#心理测试", "#测评"]);
  const title = variant.headline?.trim() || `${topic}测评｜${variant.styleName ?? variant.label}`;
  const body = variant.description?.trim() || `围绕“${topic}”整理了一份测评内容，欢迎你也来试试。`;
  return {
    title,
    body,
    hashtags,
    source: "fallback",
    compliancePromptPath: contentPromptPath
  };
}

function buildSystemPrompt(contentRules: string): string {
  return [
    "你是一位小红书图文文案专家，擅长按输入语境从零生成标题、正文、话题。",
    "必须输出 JSON：{\"title\":\"...\",\"body\":\"...\",\"hashtags\":[\"#...\", \"#...\"]}",
    "标题与正文应与用户主题和测评语境强相关，风格偏小红书爆款，允许一定随机性。",
    "严禁输出与 JSON 无关的说明。",
    "",
    "以下是合规与敏感词规则（必须遵守）：",
    contentRules
  ].join("\n");
}

function buildUserPrompt(topic: string, variant: ExportVariantInput): string {
  const scenario = [
    `主题：${topic}`,
    `测评标题：${variant.headline}`,
    `测评简介：${variant.description}`,
    `封面标题：${variant.coverTitle}`,
    `封面副标题：${variant.coverSubtitle}`,
    `风格：${variant.styleName ?? variant.label}`,
    `题目摘要：${variant.questions.slice(0, 3).map((item) => item.title).join("；")}`,
    `结果摘要：${variant.results.slice(0, 2).map((item) => `${item.title}:${item.description}`).join("；")}`
  ].join("\n");

  return [
    "请基于下面语境，直接生成小红书图文文案：",
    scenario,
    "",
    "要求：",
    "1) 标题 1 条，正文 1 段或多段，话题 5-10 个。",
    "2) 话题必须用 # 开头，且与主题强相关。",
    "3) 不要写“标题：”“正文：”等标签。"
  ].join("\n");
}

export async function generateXiaohongshuCopy(
  params: GenerateXiaohongshuCopyParams
): Promise<XiaohongshuCopyResult> {
  const { topic, variant, preferredProvider = "auto" } = params;
  const fallback = buildFallbackCopy(topic, variant);

  if (shouldForceLocalByRunMode() || preferredProvider === "local") {
    return fallback;
  }

  try {
    const { contentPrompt, bannedWords } = await loadContentPromptAndWordList();
    const client = new UnifiedLlmClient({ preferredProvider });
    if (!client.hasRemoteProvider()) {
      return fallback;
    }

    const response = await client.generate({
      systemPrompt: buildSystemPrompt(contentPrompt),
      userPrompt: buildUserPrompt(topic, variant),
      timeoutMs: 90_000
    });
    const parsed = parseModelJson(response.content);

    const rawTitle = typeof parsed.title === "string" ? parsed.title.trim() : fallback.title;
    const rawBody = typeof parsed.body === "string" ? parsed.body.trim() : fallback.body;
    const title = sanitizeCopyText(rawTitle, bannedWords);
    const body = sanitizeCopyText(rawBody, bannedWords);
    const hashtags = normalizeHashtags(parsed.hashtags, fallback.hashtags);

    if (!title || !body || hashtags.length === 0) {
      return fallback;
    }

    return {
      title,
      body,
      hashtags,
      source: "remote",
      compliancePromptPath: contentPromptPath
    };
  } catch {
    return fallback;
  }
}
