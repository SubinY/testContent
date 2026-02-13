import { readFile } from "node:fs/promises";
import path from "node:path";

const CONTENT_PROMPT_RELATIVE_PATH = "content-prompt.md";

const DEFAULT_REPLACEMENTS: Record<string, string> = {
  最有效: "我用着感觉还不错",
  治愈: "让我心情放松了很多",
  第一: "我目前最喜欢的一款",
  秒杀: "日常好价分享",
  改善敏感肌: "用完皮肤没那么容易泛红了"
};

// 来源：content-prompt.md -> "1. 极限/绝对化用语（严禁夸张承诺）"
const DEFAULT_BANNED_WORDS = [
  "国家级",
  "世界级",
  "最高级",
  "第一",
  "唯一",
  "首个",
  "首选",
  "顶级",
  "国家级产品",
  "填补国内空白",
  "独家",
  "首家",
  "最新",
  "最先进",
  "第一品牌",
  "金牌",
  "名牌",
  "优秀",
  "全网销量第一",
  "全球首发",
  "全国首家",
  "全网首发",
  "世界领先",
  "顶级工艺",
  "王牌",
  "销量冠军",
  "第一(NO1\\Top1)",
  "极致",
  "永久",
  "掌门人",
  "领袖品牌",
  "独一无二",
  "绝无仅有",
  "史无前例",
  "万能",
  "最高",
  "最低",
  "最",
  "最具",
  "最便宜",
  "最大程度",
  "最新技术",
  "最先进科学",
  "最佳",
  "最大",
  "最好",
  "最新科学",
  "最先进加工工艺",
  "最时尚",
  "最受欢迎",
  "最先",
  "绝对值",
  "100%",
  "绝对",
  "大牌",
  "精确",
  "超赚",
  "领导品牌",
  "领先上市",
  "巨星",
  "著名",
  "奢侈",
  "世界全国X大品牌之一",
  "国际品质",
  "高档",
  "正品"
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function loadContentPromptAndWordList(): Promise<{
  contentPrompt: string;
  bannedWords: string[];
}> {
  const filePath = path.join(process.cwd(), CONTENT_PROMPT_RELATIVE_PATH);
  const contentPrompt = await readFile(filePath, "utf8");
  const bannedWords = Array.from(new Set(DEFAULT_BANNED_WORDS)).sort(
    (left, right) => right.length - left.length
  );
  return { contentPrompt, bannedWords };
}

export function sanitizeCopyText(input: string, bannedWords: string[]): string {
  let output = input;

  Object.entries(DEFAULT_REPLACEMENTS).forEach(([from, to]) => {
    output = output.replace(new RegExp(escapeRegExp(from), "g"), to);
  });

  bannedWords.forEach((word) => {
    if (word.length < 1) {
      return;
    }
    output = output.replace(new RegExp(escapeRegExp(word), "g"), "***");
  });

  return output.trim();
}

export const contentPromptPath = CONTENT_PROMPT_RELATIVE_PATH;
