import type { DailySource } from "@/types";

const KAOLA_HOT_URL = "https://www.kaolamedia.com/hot";
const SECTIONS = ["百度热点", "微博热点", "百度贴吧", "抖音热搜"];

function extractTitles(html: string, regex: RegExp): string[] {
  const results: string[] = [];
  let match: RegExpExecArray | null = null;
  while ((match = regex.exec(html)) !== null) {
    const text = match[1]?.replace(/\s+/g, " ").trim();
    if (!text || text.length < 4) {
      continue;
    }
    // 过滤掉明显不是标题的内容（如数字、符号等）
    if (/^[\d\s\-\.]+$/.test(text)) {
      continue;
    }
    results.push(text);
  }
  return Array.from(new Set(results)).slice(0, 10);
}

function extractSectionTitles(html: string, label: string): string[] {
  // 首先找到标题位置
  const start = html.indexOf(label);
  if (start < 0) {
    return [];
  }

  // 提取从标题开始到下一个标题之间的内容
  const tail = html.slice(start);
  const nextSections = SECTIONS.filter((s) => s !== label)
    .map((item) => {
      const idx = tail.indexOf(item);
      return idx > 0 ? idx : Infinity;
    })
    .filter((idx) => idx !== Infinity);
  
  const nextIndex = nextSections.length > 0 ? Math.min(...nextSections) : tail.length;
  const scoped = tail.slice(0, Math.min(nextIndex, 5000)); // 扩大搜索范围

  // 根据实际网页结构，热点标题通常在以下模式中：
  // 1. <a>标签内的文本（最常见）
  // 2. 数字编号后的文本（如 "1 最深切的牵挂"）
  // 3. 在表格或列表项中的文本
  
  const allTitles: string[] = [];
  
  // 模式1: 提取所有链接文本（最可靠）
  const linkMatches = scoped.matchAll(/<a[^>]*>([^<]{4,50})<\/a>/g);
  for (const match of linkMatches) {
    const text = match[1]?.trim();
    if (text && text.length >= 4 && text.length <= 50) {
      allTitles.push(text);
    }
  }
  
  // 模式2: 提取数字编号后的文本（如 "1 最深切的牵挂"）
  const numberedMatches = scoped.matchAll(/\s+(\d+)\s+([^\d<]{4,50})/g);
  for (const match of numberedMatches) {
    const num = match[1];
    const text = match[2]?.trim();
    // 确保是有效的编号（1-50之间）且文本合理
    if (num && parseInt(num) <= 50 && text && text.length >= 4 && text.length <= 50) {
      allTitles.push(text);
    }
  }
  
  // 模式3: 提取包含中文的文本块（作为补充）
  const chineseMatches = scoped.matchAll(/>([\u4e00-\u9fa5]{4,30})</g);
  for (const match of chineseMatches) {
    const text = match[1]?.trim();
    if (text && text.length >= 4 && text.length <= 30) {
      allTitles.push(text);
    }
  }

  // 去重并过滤
  const uniqueTitles = Array.from(new Set(allTitles))
    .filter((title) => {
      // 过滤掉明显不是热点的内容
      if (title.length < 4 || title.length > 50) return false;
      // 过滤掉导航、按钮等文本
      if (/^(热度|查看|更多|展开|收起|搜百度|提一提建议|加入收藏|回首页|收藏|关注|推荐|加好友|回顶部|关于我们|鸣谢名单|支持我们|加入我们)$/i.test(title)) return false;
      // 过滤掉纯数字或数字+单位
      if (/^\d+[万千]?$/.test(title)) return false;
      // 过滤掉明显的UI元素文本
      if (/^(Windows|Mac|使用|Ctrl|command|微信扫码|可获得|关于本产品|介绍文章|右上角|分享给朋友)$/i.test(title)) return false;
      // 过滤掉包含特殊符号过多的文本
      if ((title.match(/[^\u4e00-\u9fa5\w\s]/g) || []).length > title.length / 2) return false;
      return true;
    })
    .slice(0, 15); // 增加到15条，后续再筛选

  return uniqueTitles;
}

async function fetchWithTimeout(url: string, timeoutMs = 8000): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36"
      },
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchDailyHotspots(): Promise<DailySource[]> {
  const html = await fetchWithTimeout(KAOLA_HOT_URL);
  return SECTIONS.map((label) => ({
    name: `考拉热点·${label}`,
    url: KAOLA_HOT_URL,
    titles: extractSectionTitles(html, label)
  })).filter((item) => item.titles.length > 0);
}
