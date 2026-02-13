import { z } from "zod";

import { pickTheme } from "@/styles/themes";
import type { TestOption, TestQuestion, TestResult, TestVariant, TopicAnalysis } from "@/types";

type StyleLabel = "A" | "B" | "C" | "D" | "E";

export type AssessmentStyleKey =
  | "image_projection"
  | "story_scene"
  | "attachment_index"
  | "life_potential"
  | "mental_health_check";

export interface AssessmentStyle {
  key: AssessmentStyleKey;
  name: string;
  theoryBase: string[];
  knowledgeConstraints: string[];
  tone: string;
  guideline: string;
  questionCount: number;
  optionCount: number;
  requiresImage: boolean;
  imageAspectRatio: "auto" | "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
}

export const ASSESSMENT_STYLES: Record<StyleLabel, AssessmentStyle> = {
  A: {
    key: "image_projection",
    name: "第一眼图像投射型",
    theoryBase: [
      "投射测验理论",
      "罗夏墨迹测验原理（娱乐化改编）",
      "格式塔知觉理论",
      "巴纳姆效应（传播层面）"
    ],
    knowledgeConstraints: [
      "不声称诊断功能",
      "使用概率性与象征性表达",
      "避免病理化描述"
    ],
    tone: "高点击、直观、悬念感",
    guideline: "核心题围绕第一眼识别，结果解释要短促有记忆点。",
    questionCount: 1,
    optionCount: 4,
    requiresImage: true,
    imageAspectRatio: "1:1"
  },
  B: {
    key: "story_scene",
    name: "场景选择剧情型",
    theoryBase: ["荣格原型理论", "叙事心理学", "心理意象技术", "象征主义投射机制"],
    knowledgeConstraints: [
      "场景象征保持跨文化通用",
      "不做宗教宿命论",
      "强调成长导向而非定型标签"
    ],
    tone: "沉浸、连贯、引导探索",
    guideline: "题目按剧情阶段推进，保证森林-房子-门-房间-人物链路。",
    questionCount: 5,
    optionCount: 4,
    requiresImage: false,
    imageAspectRatio: "auto"
  },
  C: {
    key: "attachment_index",
    name: "情感依恋指数型",
    theoryBase: ["依恋理论", "成人依恋模型", "亲密关系维度理论", "情绪调节理论"],
    knowledgeConstraints: ["明确非临床评估", "分数逻辑参考公开量表结构", "建议部分积极可执行"],
    tone: "共鸣强、可转发、量化感",
    guideline: "10题半量表结构，结果卡需给出依恋倾向与关系建议。",
    questionCount: 10,
    optionCount: 4,
    requiresImage: false,
    imageAspectRatio: "auto"
  },
  D: {
    key: "life_potential",
    name: "人生潜力预测型",
    theoryBase: ["积极心理学", "优势理论", "自我效能感理论", "未来时间观理论"],
    knowledgeConstraints: [
      "禁止确定性预言",
      "使用倾向性表达",
      "结论回归努力与环境互动"
    ],
    tone: "鼓舞、正向、可传播",
    guideline: "题目聚焦价值观与行动偏好，结果强调潜力路径和下一步行动。",
    questionCount: 6,
    optionCount: 4,
    requiresImage: false,
    imageAspectRatio: "auto"
  },
  E: {
    key: "mental_health_check",
    name: "心理健康自评型",
    theoryBase: ["认知行为理论（CBT）", "情绪评估量表结构逻辑参考", "压力-应对模型", "正念理论"],
    knowledgeConstraints: ["必须含非医疗声明", "不提供诊断承诺", "高风险提示要引导现实求助资源"],
    tone: "温和、陪伴、可信",
    guideline: "9题情绪自评结构，语言柔和，结果给风险等级与可执行调节建议。",
    questionCount: 9,
    optionCount: 4,
    requiresImage: false,
    imageAspectRatio: "auto"
  }
};

const STYLE_LABELS: StyleLabel[] = ["A", "B", "C", "D", "E"];
const STYLE_SEQUENCE = STYLE_LABELS.map((label) => ASSESSMENT_STYLES[label]);

const optionSchema = z.object({
  text: z.string().min(1),
  score: z.number().int().min(1).max(4).optional(),
  scoreVector: z.record(z.number().int().min(0).max(2)).optional()
});

const questionSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional(),
  dimension: z.string().optional(),
  options: z.array(optionSchema).min(3).max(5)
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
  styleSummary: z.string().optional(),
  psychologyBase: z.array(z.string()).optional(),
  imagePrompt: z.string().optional(),
  imageAspectRatio: z.string().optional(),
  questions: z.array(questionSchema).min(1).max(12),
  results: z.array(resultSchema).min(4).max(4),
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
    styleSummary: { type: "string" },
    psychologyBase: { type: "array", items: { type: "string" } },
    imagePrompt: { type: "string" },
    imageAspectRatio: { type: "string" },
    questions: {
      type: "array",
      minItems: 1,
      maxItems: 12,
      items: {
        type: "object",
        required: ["title", "options"],
        properties: {
          title: { type: "string" },
          subtitle: { type: "string" },
          dimension: { type: "string" },
          options: {
            type: "array",
            minItems: 3,
            maxItems: 5,
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

function buildTopicAnalysisPromptBlock(topicAnalysis: TopicAnalysis): string {
  const surface = topicAnalysis.deconstruction.surfaceImagery;
  const deep = topicAnalysis.deconstruction.deepConstruct;
  const confidence = topicAnalysis.theoryFramework.confidence;
  const theories = topicAnalysis.theoryFramework.primaryTheories.map((item) => item.name).join("、");
  const dimensions = topicAnalysis.theoryFramework.dimensions
    .map((item) => `${item.name}(${item.indicatorType})`)
    .join("、");

  return [
    "主题解构引擎输出（必须对齐，不可忽略）：",
    `- 表面意象：元素=${surface.concreteElements.join("、") || "无"}；感官=${surface.sensoryChannel}；情绪=${surface.emotionalTone}`,
    `- 深层构念：${deep.abstractConcept}；行为倾向=${deep.behavioralTendency}；时间指向=${deep.timeOrientation}`,
    `- 测量目标：${topicAnalysis.deconstruction.assessmentGoal}`,
    `- 理论组合：${theories}`,
    `- 可测量维度：${dimensions}`,
    `- 置信度：${confidence.level}；理由=${confidence.reasoning}`,
    `- 效度威胁：${confidence.validityThreats.join("；")}`,
    `- 风格建议：${topicAnalysis.formConstraints.recommendedStyles.join("、")}`,
    `- 特别注意：${topicAnalysis.formConstraints.specialConsiderations.join("；") || "无"}`
  ].join("\n");
}

const SYSTEM_PROMPT_BASE = `
你是心理测评内容引擎，负责生成用于社交平台传播的中文测评。
必须遵守：
1. 只输出 JSON 对象，不输出 markdown 与解释。
2. 不可使用固定模板句反复套用，必须围绕主题动态生成。
3. 输出必须可被 JSON.parse 直接解析。
4. 题目、选项、结果要保持逻辑连贯，避免空泛鸡汤。
5. 禁止医疗诊断、歧视、违法、恐吓、有害暗示。
`.trim();

function styleStructureInstruction(style: AssessmentStyle): string {
  if (style.key === "image_projection") {
    return "题目结构：1道“第一眼图像投射题”，4个可区分选项，4个结果卡；需要给出 imagePrompt。";
  }
  if (style.key === "story_scene") {
    return "题目结构：5道剧情推进题（森林->房子->门->房间->遇见的人），每题4个分支选项。";
  }
  if (style.key === "attachment_index") {
    return "题目结构：10道关系倾向题，题干偏行为频率与亲密关系情境，4选项。";
  }
  if (style.key === "life_potential") {
    return "题目结构：6道价值观/决策题，强调潜力方向，不可宿命论。";
  }
  return "题目结构：9道心理状态自评题，语气温和，结果含风险等级与调节建议。";
}

export function sampleAssessmentStyles(count: number): Array<{ label: StyleLabel; style: AssessmentStyle }> {
  const safeCount = clamp(Math.floor(count), 1, STYLE_LABELS.length);
  const pool = [...STYLE_LABELS];

  for (let index = pool.length - 1; index > 0; index -= 1) {
    const next = Math.floor(Math.random() * (index + 1));
    [pool[index], pool[next]] = [pool[next], pool[index]];
  }

  return pool.slice(0, safeCount).map((label) => ({ label, style: ASSESSMENT_STYLES[label] }));
}

export function sampleAssessmentStylesByRecommendation(
  count: number,
  recommendedStyles: string[]
): Array<{ label: StyleLabel; style: AssessmentStyle }> {
  const safeCount = clamp(Math.floor(count), 1, STYLE_LABELS.length);
  const sampled = sampleAssessmentStyles(STYLE_LABELS.length);
  const recommendedSet = new Set(recommendedStyles);

  const preferred = sampled.filter((item) => recommendedSet.has(item.style.name));
  const fallback = sampled.filter((item) => !recommendedSet.has(item.style.name));
  return [...preferred, ...fallback].slice(0, safeCount);
}

export function getAvailableStyleCount(allowImageStyles: boolean): number {
  return allowImageStyles ? STYLE_SEQUENCE.length : STYLE_SEQUENCE.filter((item) => !item.requiresImage).length;
}

export function sampleAssessmentStylesByPolicy(params: {
  count: number;
  recommendedStyles?: string[];
  allowedStyleKeys?: string[];
  allowImageStyles?: boolean;
}): Array<{ label: StyleLabel; style: AssessmentStyle }> {
  const { count, recommendedStyles = [], allowedStyleKeys = [], allowImageStyles = true } = params;
  const safeCount = clamp(Math.floor(count), 1, STYLE_LABELS.length);
  const recommendedSet = new Set(recommendedStyles);
  const allowedSet = new Set(allowedStyleKeys);
  const baseSequence = allowImageStyles ? STYLE_SEQUENCE : STYLE_SEQUENCE.filter((item) => !item.requiresImage);
  const shuffled = [...baseSequence];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const next = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[next]] = [shuffled[next], shuffled[index]];
  }

  const allowed = allowedSet.size > 0 ? shuffled.filter((item) => allowedSet.has(item.key)) : shuffled;
  const pool = allowed.length > 0 ? allowed : shuffled;
  if (pool.length === 0) {
    return [];
  }
  const preferred = pool.filter((item) => recommendedSet.has(item.name));
  const fallback = pool.filter((item) => !recommendedSet.has(item.name));
  const ordered = [...preferred, ...fallback];

  const outputCount = allowedSet.size > 0 ? safeCount : Math.min(safeCount, ordered.length);
  return Array.from({ length: outputCount }, (_, index) => ({
    label: STYLE_LABELS[index],
    style: ordered[index % ordered.length]
  }));
}

export function buildSystemPrompt(label: string, style: AssessmentStyle, topicAnalysis: TopicAnalysis): string {
  return `
${SYSTEM_PROMPT_BASE}

当前变体：${label}
风格：${style.name}
语气要求：${style.tone}
风格执行：${style.guideline}
心理学理论基础：${style.theoryBase.join("、")}
约束：${style.knowledgeConstraints.join("；")}
${styleStructureInstruction(style)}
${buildTopicAnalysisPromptBlock(topicAnalysis)}
`.trim();
}

export function buildUserPrompt(topic: string, label: string, style: AssessmentStyle, topicAnalysis: TopicAnalysis): string {
  return `
主题：${topic}
变体：${label}（${style.name}）
推荐风格：${topicAnalysis.formConstraints.recommendedStyles.join("、")}
风格适配说明：${topicAnalysis.formConstraints.styleAdaptationNotes}

请围绕“${topic}”生成完整测评，必须满足：
1. 题目数固定为 ${style.questionCount}。
2. 每题选项固定为 ${style.optionCount}，每个选项 score 范围 1-4。
3. results 固定 4 张卡片，并提供 scoreRange。
4. 全中文表达，场景化、第二人称、可传播。
5. 非临床、非诊断表达。

返回纯 JSON：
${JSON.stringify(GENERATION_JSON_SCHEMA)}
`.trim();
}

export function buildNanoBananaPrompt(topic: string, style: AssessmentStyle): string | null {
  if (!style.requiresImage) {
    return null;
  }

  return [
    `心理测评双关视觉图，主题：${topic}`,
    "高对比、强图地反转、可在第一眼产生不同解读",
    "内容中立、无暴力血腥、无医疗暗示、无品牌logo",
    "干净背景，社交平台封面风格"
  ].join("；");
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
      result[key] = clamp(Math.floor(value), 0, 3);
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function splitRanges(totalQuestions: number, minOption = 1, maxOption = 4): [number, number][] {
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

function buildFallbackQuestion(topic: string, index: number, style: AssessmentStyle, random: () => number): TestQuestion {
  const imageProjectionOptions = ["先看到钥匙", "先看到窗户", "先看到人脸", "先看到迷宫"];
  const storyStages = ["森林", "房子", "门", "房间", "遇见的人"];
  const attachmentPrompts = [
    "对方回消息慢时，你通常会？",
    "关系起冲突时，你第一反应是？",
    "需要表达需求时，你更常？",
    "被忽略后你会？",
    "关系不确定时你会？",
    "约会前你最担心？",
    "对方情绪低落时你会？",
    "出现距离感时你会？",
    "亲密关系中你最看重？",
    "关系稳定后你更常？"
  ];
  const lifePrompts = [
    "面对高不确定机会时，你会？",
    "你做重要决定时最先考虑？",
    "精力有限时你会优先？",
    "遇到阻力时你倾向？",
    "你衡量成功更看重？",
    "你对未来规划更像？"
  ];
  const healthPrompts = [
    "最近一周你入睡前脑内是否停不下来？",
    "最近一周你是否容易情绪波动？",
    "最近一周你是否经常自我苛责？",
    "最近一周你是否感到持续疲惫？",
    "最近一周你是否难以专注当前任务？",
    "最近一周你是否会无明显原因焦虑？",
    "最近一周你是否容易被小事触发？",
    "最近一周你是否明显回避社交？",
    "最近一周你是否感觉内耗影响行动？",
    "这些状态对你的工作、社交或生活功能影响有多大？"
  ];

  if (style.key === "image_projection") {
    return {
      id: "q-1",
      title: `看到“${topic}”主题图时，你第一眼是？`,
      subtitle: "按第一直觉选择，不要反复比较。",
      dimension: "潜意识偏好",
      options: imageProjectionOptions.map((text, optionIndex) => ({
        id: `q1-o${optionIndex + 1}`,
        text,
        scoreKey: "潜意识偏好",
        score: 4 - optionIndex
      }))
    };
  }

  if (style.key === "story_scene") {
    const stage = storyStages[index] ?? `场景${index + 1}`;
    return {
      id: `q-${index + 1}`,
      title: `在“${stage}”这个剧情节点，你会怎么做？`,
      subtitle: `围绕“${topic}”场景做直觉选择。`,
      dimension: "叙事选择",
      options: [
        { id: `q${index + 1}-o1`, text: "主动推进", scoreKey: "叙事选择", score: 4 },
        { id: `q${index + 1}-o2`, text: "先观察", scoreKey: "叙事选择", score: 3 },
        { id: `q${index + 1}-o3`, text: "寻求支持", scoreKey: "叙事选择", score: 2 },
        { id: `q${index + 1}-o4`, text: "暂时回避", scoreKey: "叙事选择", score: 1 }
      ]
    };
  }

  if (style.key === "attachment_index") {
    const optionPool = [
      { text: "几乎总是", anxiety: 3, avoidance: 1 },
      { text: "经常如此", anxiety: 2, avoidance: 1 },
      { text: "偶尔如此", anxiety: 1, avoidance: 2 },
      { text: "很少如此", anxiety: 0, avoidance: 3 }
    ];
    return {
      id: `q-${index + 1}`,
      title: attachmentPrompts[index] ?? `亲密关系题 ${index + 1}`,
      subtitle: `围绕“${topic}”关系体验作答。`,
      dimension: "依恋倾向",
      options: optionPool.map((item, optionIndex) => ({
        id: `q${index + 1}-o${optionIndex + 1}`,
        text: item.text,
        scoreKey: "依恋倾向",
        score: 4 - optionIndex,
        scoreVector: {
          anxiety: item.anxiety,
          avoidance: item.avoidance
        }
      }))
    };
  }

  if (style.key === "life_potential") {
    return {
      id: `q-${index + 1}`,
      title: lifePrompts[index] ?? `潜力倾向题 ${index + 1}`,
      subtitle: `与你的“${topic}”发展方向相关。`,
      dimension: "优势潜力",
      options: [
        { id: `q${index + 1}-o1`, text: "先做后调", scoreKey: "优势潜力", score: 4 },
        { id: `q${index + 1}-o2`, text: "稳步推进", scoreKey: "优势潜力", score: 3 },
        { id: `q${index + 1}-o3`, text: "谨慎评估", scoreKey: "优势潜力", score: 2 },
        { id: `q${index + 1}-o4`, text: "等待时机", scoreKey: "优势潜力", score: 1 }
      ]
    };
  }

  const fallbackOptions = [
    { text: "几乎每天", score: 4 },
    { text: "一周数次", score: 3 },
    { text: "偶尔出现", score: 2 },
    { text: "很少出现", score: 1 }
  ];
  const title = healthPrompts[index] ?? `状态自评题 ${index + 1}`;
  const fallbackShift = Math.floor(random() * 2);

  return {
    id: `q-${index + 1}`,
    title,
    subtitle: `围绕“${topic}”近期状态进行自评。`,
    dimension: "情绪状态",
    options: fallbackOptions.map((option, optionIndex) => ({
      id: `q${index + 1}-o${optionIndex + 1}`,
      text: option.text,
      scoreKey: "情绪状态",
      score: clamp(option.score - fallbackShift, 1, 4)
    }))
  };
}

function buildFallbackResult(topic: string, index: number, style: AssessmentStyle, totalQuestions: number): TestResult {
  const ranges = splitRanges(totalQuestions);
  const styleResultTitles: Record<AssessmentStyleKey, string[]> = {
    image_projection: ["直觉锚定型", "情绪感应型", "控制边界型", "探索觉察型"],
    story_scene: ["冒险开拓者", "稳态建构者", "关系连接者", "谨慎守门人"],
    attachment_index: ["安全连接型", "焦虑敏感型", "回避防御型", "波动混合型"],
    life_potential: ["行动驱动型", "成长积累型", "策略思辨型", "机会等待型"],
    mental_health_check: ["低风险稳定区", "轻度压力区", "中度消耗区", "高压预警区"]
  };

  const styleResultDescriptions: Record<AssessmentStyleKey, string[]> = {
    image_projection: [
      `你在“${topic}”上倾向先抓主线，再进入细节。你的注意力锚点清晰。建议把第一直觉转化成 1 个可执行动作。`,
      `你在“${topic}”上对氛围变化很敏感。你更容易捕捉隐含信号。建议建立稳定节奏，避免被情绪拉扯。`,
      `你在“${topic}”上边界意识较强。你倾向先确认安全感。建议在守住边界的同时留出试错空间。`,
      `你在“${topic}”上具备探索动机。你愿意在不确定中寻找线索。建议每次只增加一个新变量。`
    ],
    story_scene: [
      `你在“${topic}”剧情中偏主动开路。你对未知有行动力。建议给关键节点设置复盘，避免冲动推进。`,
      `你在“${topic}”剧情中重视稳定结构。你擅长长期建设。建议定期引入小挑战，维持成长曲线。`,
      `你在“${topic}”剧情中强调关系与协作。你具备连接能力。建议明确边界，降低情绪透支。`,
      `你在“${topic}”剧情中更偏谨慎防守。你风险识别能力强。建议设立决策截止点，防止过度迟疑。`
    ],
    attachment_index: [
      `你在“${topic}”相关关系中表现出较高安全感。你能稳定表达需求。建议继续保持沟通和修复机制。`,
      `你在“${topic}”关系中更容易对反馈敏感。你渴望被确认。建议练习先自我安抚再沟通。`,
      `你在“${topic}”关系中习惯自我保护。你重视独立性。建议逐步增加情绪表达频率。`,
      `你在“${topic}”关系中呈现波动状态。不同场景反应差异大。建议记录触发点并建立应对脚本。`
    ],
    life_potential: [
      `你在“${topic}”上具备行动转化优势。你适合先做出样本再迭代。建议每周固定一次复盘。`,
      `你在“${topic}”上具备持续积累能力。你更容易形成长期复利。建议明确阶段成果，增强反馈感。`,
      `你在“${topic}”上擅长策略和判断。你能看到多路径方案。建议防止评估过量拖慢启动。`,
      `你在“${topic}”上偏谨慎等待。你能避开部分风险。建议用小实验替代长期观望。`
    ],
    mental_health_check: [
      `你在“${topic}”相关状态总体稳定。当前可继续维持健康节律。建议保留睡眠与运动的基础习惯。`,
      `你在“${topic}”上出现轻度压力信号。你仍有较强调节空间。建议减少信息过载并增加放松锚点。`,
      `你在“${topic}”上有明显消耗感。你需要系统恢复策略。建议把任务拆小并加入规律休息。`,
      `你在“${topic}”上进入高压预警。请优先保障现实支持网络。若持续不适，建议尽快寻求专业帮助或当地心理援助热线。`
    ]
  };

  return {
    id: `result-${index + 1}`,
    title: styleResultTitles[style.key][index] ?? `结果${index + 1}`,
    description: styleResultDescriptions[style.key][index] ?? `你在“${topic}”上有独特模式，建议用小步行动持续优化。`,
    cta: "保存结果页并分享给朋友，一起对比类型。",
    scoreRange: ranges[index] ?? [1, totalQuestions * 4]
  };
}

function normalizeQuestions(input: unknown, topic: string, label: string, style: AssessmentStyle): TestQuestion[] {
  const random = createSeededRandom(topic.length * 131 + label.charCodeAt(0) * 17);
  const list = Array.isArray(input) ? input : [];

  return Array.from({ length: style.questionCount }, (_, index) => {
    const raw = list[index] as Record<string, unknown> | undefined;
    const fallback = buildFallbackQuestion(topic, index, style, random);
    const optionsRaw = Array.isArray(raw?.options) ? raw.options : [];

    const options: TestOption[] = Array.from({ length: style.optionCount }, (_, optionIndex) => {
      const optionRaw = optionsRaw[optionIndex] as Record<string, unknown> | undefined;
      const fallbackOption = fallback.options[optionIndex] ?? fallback.options[fallback.options.length - 1];
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
        scoreKey: safeText(raw?.dimension, fallback.dimension ?? style.name),
        score,
        scoreVector
      };
    });

    return {
      id: `q-${index + 1}`,
      title: safeText(raw?.title, fallback.title),
      subtitle: safeText(raw?.subtitle, fallback.subtitle),
      dimension: safeText(raw?.dimension, fallback.dimension ?? style.name),
      options
    };
  });
}

function normalizeResults(input: unknown, topic: string, style: AssessmentStyle, totalQuestions: number): TestResult[] {
  const list = Array.isArray(input) ? input : [];
  const defaultRanges = splitRanges(totalQuestions);

  return Array.from({ length: 4 }, (_, index) => {
    const raw = list[index] as Record<string, unknown> | undefined;
    const fallback = buildFallbackResult(topic, index, style, totalQuestions);
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
  params: { topic: string; label: string; variantIndex: number; style: AssessmentStyle }
): TestVariant {
  const { topic, label, variantIndex, style } = params;
  const safePayload = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const parsed = generatedVariantSchema.safeParse(safePayload);
  const source = parsed.success ? parsed.data : safePayload;
  const theme = pickTheme(variantIndex);

  const headline = safeText(source.headline, `${topic} 心理测试 · ${style.name}`);
  const description = safeText(source.description, `围绕“${topic}”生成的 ${style.name} 测评内容。`);
  const coverTitle = safeText(source.coverTitle, `${topic}：${style.name} 测评`);
  const coverSubtitle = safeText(source.coverSubtitle, `${style.questionCount} 道题，快速得到你的结果画像。`);

  const questions = normalizeQuestions(source.questions, topic, label, style);
  const results = normalizeResults(source.results, topic, style, questions.length);
  const hashtags = normalizeList(source.hashtags, [
    `#${topic.replace(/\s+/g, "")}`,
    "#心理测试",
    `#${style.name}`,
    "#TestFlow"
  ]).slice(0, 12);
  const dmScripts = normalizeList(source.dmScripts, [
    `我刚做了“${topic}”的${style.name}，你也来测测？`,
    `这个“${topic}”测评是${style.name}路线，结果很有意思。`,
    `我拿到的是 ${label} 变体，我们对比一下。`
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
  const imagePrompt = safeText(source.imagePrompt, buildNanoBananaPrompt(topic, style) ?? "");
  const imageAspectRatio = safeText(source.imageAspectRatio, style.imageAspectRatio);

  return {
    id: `${toId(topic)}-${label.toLowerCase()}`,
    label,
    styleKey: style.key,
    styleName: style.name,
    headline,
    description,
    coverTitle,
    coverSubtitle,
    questions,
    results,
    imagePrompt: imagePrompt || undefined,
    imageAspectRatio,
    hashtags,
    dmScripts,
    themeKey: theme.key,
    psychologyBase: normalizeList(source.psychologyBase, style.theoryBase),
    copyPackage: {
      titles: copyTitles,
      content: copyContent,
      hashtags: copyHashtags,
      dmScripts: copyDmScripts
    }
  };
}

export function generateLocalVariant(
  topic: string,
  label: string,
  variantIndex: number,
  style: AssessmentStyle
): TestVariant {
  const random = createSeededRandom(topic.length * 97 + variantIndex * 29 + label.charCodeAt(0) * 11);
  const questions = Array.from({ length: style.questionCount }, (_, index) =>
    buildFallbackQuestion(topic, index, style, random)
  );
  const results = Array.from({ length: 4 }, (_, index) => buildFallbackResult(topic, index, style, questions.length));

  const payload = {
    headline: `${topic} 心理测试 · ${style.name}`,
    description: `根据“${topic}”生成的${style.name}测评，便于快速识别当下倾向。`,
    coverTitle: `${topic}：${style.name}`,
    coverSubtitle: `${style.questionCount} 道题，完成后可直接分享结果。`,
    psychologyBase: style.theoryBase,
    imagePrompt: buildNanoBananaPrompt(topic, style) ?? undefined,
    imageAspectRatio: style.imageAspectRatio,
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
    hashtags: [`#${topic.replace(/\s+/g, "")}`, "#心理测试", `#${style.name}`, "#TestFlow"],
    dmScripts: [
      `我刚做了“${topic}”${style.name}，结果挺准。`,
      `你也来测一下“${topic}”，看看是不是同一类型。`,
      `我做的是 ${label} 变体，测完一起对比。`
    ],
    copyPackage: {
      titles: [`${topic} 心理测试`, `${style.name} 结果解析`],
      content: [`围绕“${topic}”生成的 ${style.questionCount} 题测评。`, "可直接用于预览、导出与分发。"],
      hashtags: [`#${topic.replace(/\s+/g, "")}`, "#心理测试", "#TestFlow"],
      dmScripts: [`要不要一起做“${topic}”测试？`, "我这次结果很有共鸣，你也试试。"]
    }
  };

  return repairVariantPayload(payload, { topic, label, variantIndex, style });
}
