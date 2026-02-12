import { z } from "zod";

import { pickTheme } from "@/styles/themes";
import type { TestOption, TestQuestion, TestResult, TestVariant } from "@/types";

const VARIANT_STYLE: Record<string, { tone: string; guideline: string }> = {
  A: {
    tone: "扎心现实",
    guideline: "直指问题，不回避矛盾，避免空泛安慰。"
  },
  B: {
    tone: "温暖治愈",
    guideline: "强调理解与接纳，给出温和、可执行建议。"
  },
  C: {
    tone: "犀利直接",
    guideline: "短句高密度，判断清晰，结论有锋利感。"
  },
  D: {
    tone: "理性拆解",
    guideline: "结构化表达，先结论后原因，条理清晰。"
  },
  E: {
    tone: "轻松鼓励",
    guideline: "语气轻快不轻浮，突出可达成的小行动。"
  }
};

const optionSchema = z.object({
  text: z.string().min(1),
  score: z.number().int().min(1).max(4).optional(),
  scoreVector: z.record(z.number().int().min(0).max(2)).optional()
});

const questionSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional(),
  dimension: z.string().optional(),
  options: z.array(optionSchema).min(1)
});

const resultSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  cta: z.string().optional(),
  scoreRange: z.tuple([z.number(), z.number()]).optional()
});

const copyPackageSchema = z.object({
  titles: z.array(z.string()).optional(),
  content: z.array(z.string()).optional(),
  hashtags: z.array(z.string()).optional(),
  dmScripts: z.array(z.string()).optional()
});

const generatedVariantSchema = z.object({
  headline: z.string().min(1),
  description: z.string().min(1),
  coverTitle: z.string().min(1),
  coverSubtitle: z.string().min(1),
  psychologyBase: z.array(z.string()).optional(),
  questions: z.array(questionSchema).min(1),
  results: z.array(resultSchema).min(1),
  hashtags: z.array(z.string()).optional(),
  dmScripts: z.array(z.string()).optional(),
  copyPackage: copyPackageSchema.optional()
});

export const GENERATION_JSON_SCHEMA = {
  type: "object",
  required: ["headline", "description", "coverTitle", "coverSubtitle", "questions", "results"],
  properties: {
    headline: { type: "string" },
    description: { type: "string" },
    coverTitle: { type: "string" },
    coverSubtitle: { type: "string" },
    psychologyBase: { type: "array", items: { type: "string" } },
    questions: {
      type: "array",
      minItems: 8,
      maxItems: 8,
      items: {
        type: "object",
        required: ["title", "options"],
        properties: {
          title: { type: "string" },
          subtitle: { type: "string" },
          dimension: { type: "string" },
          options: {
            type: "array",
            minItems: 4,
            maxItems: 4,
            items: {
              type: "object",
              required: ["text", "score"],
              properties: {
                text: { type: "string" },
                score: { type: "number" },
                scoreVector: { type: "object" }
              }
            }
          }
        }
      }
    },
    results: {
      type: "array",
      minItems: 4,
      maxItems: 4,
      items: {
        type: "object",
        required: ["title", "description", "cta"],
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          cta: { type: "string" },
          scoreRange: {
            type: "array",
            items: { type: "number" }
          }
        }
      }
    },
    hashtags: { type: "array", items: { type: "string" } },
    dmScripts: { type: "array", items: { type: "string" } },
    copyPackage: {
      type: "object",
      properties: {
        titles: { type: "array", items: { type: "string" } },
        content: { type: "array", items: { type: "string" } },
        hashtags: { type: "array", items: { type: "string" } },
        dmScripts: { type: "array", items: { type: "string" } }
      }
    }
  }
} as const;

const SYSTEM_PROMPT_BASE = `
你是一位心理测试题目生成专家。
你的任务是根据用户主题，动态生成完整中文测试内容。

关键目标：
1. 题目、选项、结果分析都必须围绕用户主题动态生成，不允许套固定模板。
2. 只输出 JSON 对象，不允许 markdown、解释、注释。
3. 输出必须可被 JSON.parse 直接解析。

结构约束（仅约束结构，不固定内容）：
1. 固定 8 道单选题，每题固定 4 个选项。
2. 固定 4 个结果分析卡片。
3. 每个选项必须带 score（1-4），用于结果计算。

文案质量约束：
1. 全中文输出。
2. 题干必须是第二人称、场景化表达，尽量不超过 20 字。
3. 选项口语化、有画面感，尽量不超过 10 字，且互斥可区分。
4. 结果标题 4-10 字，结果描述 3 句：结论 + 原因 + 建议。
5. 禁止医疗诊断、歧视、违法、有害暗示。
`.trim();

export function buildSystemPrompt(label: string): string {
  const style = VARIANT_STYLE[label] ?? VARIANT_STYLE.A;
  return `
${SYSTEM_PROMPT_BASE}

当前变体：${label}
语气风格：${style.tone}
风格执行要求：${style.guideline}
`.trim();
}

export function buildUserPrompt(topic: string, label: string): string {
  const style = VARIANT_STYLE[label] ?? VARIANT_STYLE.A;
  return `
主题：${topic}
变体：${label}（${style.tone}）

请输出一套完整测试，必须围绕“${topic}”展开，确保内容不空泛。
只返回 JSON，不要解释文本。
JSON Schema：
${JSON.stringify(GENERATION_JSON_SCHEMA)}
`.trim();
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function safeText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function toId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

function parseScoreVector(input: unknown): Record<string, number> | undefined {
  if (!input || typeof input !== "object") {
    return undefined;
  }
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (typeof value === "number" && Number.isFinite(value)) {
      result[key] = clamp(Math.floor(value), 0, 2);
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function splitRanges(totalQuestions = 8, minOption = 1, maxOption = 4): [number, number][] {
  const minScore = totalQuestions * minOption;
  const maxScore = totalQuestions * maxOption;
  const size = Math.floor((maxScore - minScore + 1) / 4);
  const ranges: [number, number][] = [];
  let start = minScore;

  for (let index = 0; index < 4; index += 1) {
    const end = index === 3 ? maxScore : start + size - 1;
    ranges.push([start, end]);
    start = end + 1;
  }

  return ranges;
}

function createSeededRandom(seed: number): () => number {
  let value = seed % 2147483647;
  if (value <= 0) {
    value += 2147483646;
  }
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function buildFallbackQuestion(topic: string, index: number, rand: () => number): TestQuestion {
  const dimensions = [
    "动机触发点",
    "压力来源",
    "时间分配",
    "决策风格",
    "资源感知",
    "执行节奏",
    "目标期待",
    "复盘倾向"
  ];
  const scenes = ["开工前", "卡住时", "临近截止", "出现分歧", "连续忙碌后", "周末复盘"];
  const actions = ["先列清单", "先问建议", "先试一把", "先缓一缓", "先查资料", "先做最难的"];
  const concerns = ["怕做错", "怕来不及", "怕效果差", "怕方向偏", "怕被否定", "怕白忙活"];
  const expectations = ["想快点见效", "想更稳一点", "想少走弯路", "想压力更小", "想结果更好", "想更可持续"];

  const scene = scenes[Math.floor(rand() * scenes.length)];
  const action = actions[Math.floor(rand() * actions.length)];
  const concern = concerns[Math.floor(rand() * concerns.length)];
  const expectation = expectations[Math.floor(rand() * expectations.length)];

  const titles = [
    `你在${scene}处理“${topic}”时，通常会？`,
    `“${topic}”推进受阻时，你第一反应是？`,
    `面对“${topic}”的节奏变化，你更常？`,
    `做“${topic}”决策时，你最看重？`,
    `你对“${topic}”资源状态的感受更像？`,
    `执行“${topic}”计划时，你通常？`,
    `你做“${topic}”最想换来的结果是？`,
    `回看“${topic}”过程，你最怕的是？`
  ];

  return {
    id: `q-${index + 1}`,
    title: titles[index] ?? `关于“${topic}”的问题 ${index + 1}`,
    subtitle: "请选择最符合你当前状态的一项",
    dimension: dimensions[index] ?? "综合维度",
    options: [
      {
        id: `q${index + 1}-o1`,
        text: action,
        scoreKey: dimensions[index] ?? "综合维度",
        score: 4
      },
      {
        id: `q${index + 1}-o2`,
        text: concern,
        scoreKey: dimensions[index] ?? "综合维度",
        score: 3
      },
      {
        id: `q${index + 1}-o3`,
        text: expectation,
        scoreKey: dimensions[index] ?? "综合维度",
        score: 2
      },
      {
        id: `q${index + 1}-o4`,
        text: "看情况再说",
        scoreKey: dimensions[index] ?? "综合维度",
        score: 1
      }
    ]
  };
}

function buildFallbackResult(topic: string, index: number): TestResult {
  const titles = ["速推行动型", "稳步积累型", "谨慎规划型", "临界爆发型"];
  const descriptions = [
    `你在“${topic}”上偏向先动后调。你依赖行动建立反馈。建议保留复盘环节，避免冲得太散。`,
    `你在“${topic}”上更重视长期节奏。你擅长稳态推进。建议给每周设置小里程碑，持续获得正反馈。`,
    `你在“${topic}”上追求可控性。你习惯先评估再投入。建议设置决策截止点，防止准备过度。`,
    `你在“${topic}”上常靠临场爆发。你冲刺能力强。建议把任务前置拆分，降低尾部压力。`
  ];

  const ranges = splitRanges();
  return {
    id: `result-${index + 1}`,
    title: titles[index] ?? `类型${index + 1}`,
    description: descriptions[index] ?? `你在“${topic}”上有独特节奏，关键是找到更稳的推进方式。`,
    cta: "保存结果页并分享给朋友，一起对比类型。",
    scoreRange: ranges[index] ?? [8, 32]
  };
}

function normalizeQuestions(input: unknown, topic: string, label: string): TestQuestion[] {
  const random = createSeededRandom(topic.length * 131 + label.charCodeAt(0) * 17);
  const list = Array.isArray(input) ? input : [];

  return Array.from({ length: 8 }, (_, index) => {
    const raw = list[index] as Record<string, unknown> | undefined;
    const fallback = buildFallbackQuestion(topic, index, random);
    const optionsRaw = Array.isArray(raw?.options) ? raw.options : [];

    const options = Array.from({ length: 4 }, (_, optionIndex) => {
      const optionRaw = optionsRaw[optionIndex] as Record<string, unknown> | undefined;
      const fallbackOption = fallback.options[optionIndex];
      const scoreVector = parseScoreVector(optionRaw?.scoreVector);
      const vectorScore = scoreVector
        ? Object.values(scoreVector).reduce((sum, current) => sum + current, 0)
        : 0;

      const score =
        typeof optionRaw?.score === "number" && Number.isFinite(optionRaw.score)
          ? clamp(Math.floor(optionRaw.score), 1, 4)
          : clamp(vectorScore || fallbackOption.score, 1, 4);

      return {
        id: `q${index + 1}-o${optionIndex + 1}`,
        text: safeText(optionRaw?.text, fallbackOption.text),
        scoreKey: safeText(raw?.dimension, fallback.dimension ?? "综合维度"),
        score,
        scoreVector
      };
    });

    return {
      id: `q-${index + 1}`,
      title: safeText(raw?.title, fallback.title),
      subtitle: safeText(raw?.subtitle, fallback.subtitle),
      dimension: safeText(raw?.dimension, fallback.dimension ?? "综合维度"),
      options
    };
  });
}

function normalizeResults(input: unknown, topic: string): TestResult[] {
  const list = Array.isArray(input) ? input : [];
  const defaultRanges = splitRanges();

  return Array.from({ length: 4 }, (_, index) => {
    const raw = list[index] as Record<string, unknown> | undefined;
    const fallback = buildFallbackResult(topic, index);
    const rawRange = Array.isArray(raw?.scoreRange) ? raw?.scoreRange : undefined;
    const range: [number, number] =
      rawRange &&
      rawRange.length === 2 &&
      typeof rawRange[0] === "number" &&
      typeof rawRange[1] === "number" &&
      rawRange[0] <= rawRange[1]
        ? [Math.floor(rawRange[0]), Math.floor(rawRange[1])]
        : defaultRanges[index] ?? fallback.scoreRange;

    return {
      id: safeText(raw?.id, fallback.id),
      title: safeText(raw?.title, fallback.title),
      description: safeText(raw?.description, fallback.description),
      cta: safeText(raw?.cta, fallback.cta),
      scoreRange: range
    };
  });
}

function normalizeList(input: unknown, fallback: string[]): string[] {
  const list = Array.isArray(input)
    ? input.map((item) => safeText(item, "")).filter((item) => item.length > 0)
    : [];
  return list.length > 0 ? list : fallback;
}

export function parseModelJson(raw: string): unknown {
  const cleaned = raw.trim();
  if (!cleaned) {
    return {};
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const sliced = cleaned.slice(start, end + 1);
      try {
        return JSON.parse(sliced);
      } catch {
        return {};
      }
    }
  }

  return {};
}

export function repairVariantPayload(
  payload: unknown,
  topic: string,
  label: string,
  variantIndex: number
): TestVariant {
  const safePayload = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const parsed = generatedVariantSchema.safeParse(safePayload);
  const source = parsed.success ? parsed.data : safePayload;
  const theme = pickTheme(variantIndex);

  const headline = safeText(source.headline, `${topic} 心理测试 · ${label}版`);
  const description = safeText(source.description, `围绕“${topic}”动态生成的 8 题测评，帮助你快速识别当前状态。`);
  const coverTitle = safeText(source.coverTitle, `${topic}：你现在更像哪种行动者`);
  const coverSubtitle = safeText(source.coverSubtitle, "8 道题，3 分钟，拿到可分享的结果页。");

  const questions = normalizeQuestions(source.questions, topic, label);
  const results = normalizeResults(source.results, topic);
  const hashtags = normalizeList(source.hashtags, [
    `#${topic.replace(/\s+/g, "")}`,
    "#心理测试",
    "#自我探索",
    "#行为模式",
    "#TestFlow"
  ]).slice(0, 12);
  const dmScripts = normalizeList(source.dmScripts, [
    `我刚做了“${topic}”测试，你也来测一下？`,
    `这个“${topic}”测试挺有意思，想看你的结果。`,
    `我拿到的是 ${label} 版结果，我们对比一下。`,
    "三分钟就能做完，测完发我截图。"
  ]).slice(0, 12);

  const copyPackage = source.copyPackage && typeof source.copyPackage === "object" ? source.copyPackage : {};
  const copyTitles = normalizeList((copyPackage as Record<string, unknown>).titles, [headline, coverTitle]);
  const copyContent = normalizeList((copyPackage as Record<string, unknown>).content, [
    description,
    ...questions.slice(0, 3).map((question) => question.title),
    ...results.slice(0, 2).map((result) => `${result.title}：${result.description}`)
  ]);
  const copyHashtags = normalizeList((copyPackage as Record<string, unknown>).hashtags, hashtags);
  const copyDmScripts = normalizeList((copyPackage as Record<string, unknown>).dmScripts, dmScripts);

  return {
    id: `${toId(topic)}-${label.toLowerCase()}`,
    label,
    headline,
    description,
    coverTitle,
    coverSubtitle,
    questions,
    results,
    hashtags,
    dmScripts,
    themeKey: theme.key,
    psychologyBase: normalizeList(source.psychologyBase, [
      "认知行为理论",
      "动机与执行偏差理论"
    ]),
    copyPackage: {
      titles: copyTitles,
      content: copyContent,
      hashtags: copyHashtags,
      dmScripts: copyDmScripts
    }
  };
}

export function generateLocalVariant(topic: string, label: string, variantIndex: number): TestVariant {
  const random = createSeededRandom(topic.length * 97 + variantIndex * 29 + label.charCodeAt(0) * 11);
  const questions = Array.from({ length: 8 }, (_, index) => buildFallbackQuestion(topic, index, random));
  const results = Array.from({ length: 4 }, (_, index) => buildFallbackResult(topic, index));

  const payload = {
    headline: `${topic} 心理测试 · ${label}版`,
    description: `根据“${topic}”动态生成的题目版本，用于快速识别你的行为倾向。`,
    coverTitle: `${topic}：测测你当前的决策状态`,
    coverSubtitle: "每题只选一个答案，完成后可直接分享结果。",
    psychologyBase: ["认知行为理论", "决策心理学"],
    questions: questions.map((question) => ({
      title: question.title,
      subtitle: question.subtitle,
      dimension: question.dimension,
      options: question.options.map((option) => ({
        text: option.text,
        score: option.score
      }))
    })),
    results: results.map((result) => ({
      id: result.id,
      title: result.title,
      description: result.description,
      cta: result.cta,
      scoreRange: result.scoreRange
    })),
    hashtags: [
      `#${topic.replace(/\s+/g, "")}`,
      "#心理测试",
      "#自我探索",
      "#性格分析",
      "#TestFlow"
    ],
    dmScripts: [
      `我刚做了“${topic}”测试，结果有点出乎意料。`,
      `你也来测一下“${topic}”，看看我们是不是同一类型。`,
      `我做的是 ${label} 版，想看你会拿到什么结果。`,
      "只要 3 分钟，测完发我截图。"
    ],
    copyPackage: {
      titles: [`${topic} 心理测试`, `${topic} 结果解析`],
      content: [
        `围绕“${topic}”动态生成的 8 题测评。`,
        "可直接用于预览、导出和二次分发。"
      ],
      hashtags: [`#${topic.replace(/\s+/g, "")}`, "#心理测试", "#TestFlow"],
      dmScripts: [`要不要一起做“${topic}”测试？`, "我这次结果挺准的，你也测测。"]
    }
  };

  return repairVariantPayload(payload, topic, label, variantIndex);
}
