import type { XiaohongshuVariantInput } from "@/types";

export function buildXiaohongshuSystemPrompt(contentRules: string): string {
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

export function buildXiaohongshuUserPrompt(topic: string, variant: XiaohongshuVariantInput): string {
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
