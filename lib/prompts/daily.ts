import { promises as fs } from "fs";
import path from "path";

import type { DailySource } from "@/types";

let cachedTemplate: string | null = null;

async function loadCalendarTemplate(): Promise<string> {
  if (cachedTemplate) {
    return cachedTemplate;
  }
  const filePath = path.join(process.cwd(), "calendar.md");
  const raw = await fs.readFile(filePath, "utf8");
  cachedTemplate = raw;
  return raw;
}

export async function buildDailyPrompts(
  date: string,
  sources: DailySource[]
): Promise<{ systemPrompt: string; userPrompt: string }> {
  const template = await loadCalendarTemplate();
  const injected = template.replace(/\{current_date\}/g, date);
  
  if (sources.length === 0) {
    throw new Error("无法获取热点来源，请稍后重试。");
  }

  const sourceText = sources
    .map((item) => {
      const titles = item.titles.slice(0, 8);
      return `【${item.name}】\n来源链接：${item.url}\n热点标题列表：\n${titles.map((t, i) => `${i + 1}. ${t}`).join("\n")}`;
    })
    .join("\n\n");

  const systemPrompt = [
    "你是专业的心理测试内容生成助手。",
    "⚠️ 重要：你必须严格基于以下真实抓取的热点资讯生成内容，禁止自行编造或虚构热点。",
    "以下是从微博、百度、贴吧、抖音等平台实时抓取的真实热点资讯：",
    sourceText,
    "",
    "生成要求：",
    "1. 必须从上述真实热点中选择1-2个最相关的热点作为主题来源",
    "2. 生成的心理测试主题必须与所选热点紧密相关，体现热点中的情绪、关系、压力等心理元素",
    "3. 禁止编造不存在的热点或事件",
    "4. 如果热点不足或无法匹配，应明确说明并建议使用历史事件或节假日作为补充",
    "",
    injected
  ].join("\n");

  const userPrompt = [
    "请严格输出 JSON 格式，不要输出任何 Markdown 或解释说明：",
    "{",
    '  "shortTheme": "8-10 字的简短主题（必须基于上述真实热点）",',
    '  "fullContent": "Markdown 格式的完整内容，必须包含以下结构：',
    "    ## 主题：[主题名称]",
    "    ### 来源渠道：[明确标注使用的热点来源，如：微博热点·XXX]",
    "    ### 原内容：[引用的热点标题或简要描述]",
    "    ### 问题：[基于热点的心理测试问题]",
    "    ### 选项：[3-5个选项]",
    "    ### 解释：[每个选项的心理分析]",
    '  "',
    "}",
    "",
    "格式要求：",
    "1. shortTheme 为中文 8-10 字，避免标点过多",
    "2. fullContent 必须包含【来源渠道】和【原内容】两个部分，明确标注使用的热点来源",
    "3. 只输出纯 JSON，确保可被 JSON.parse 解析，不要有任何额外的 Markdown 标记或说明文字"
  ].join("\n");

  return { systemPrompt, userPrompt };
}
