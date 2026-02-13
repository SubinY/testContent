import type { GeneratedTest, TestQuestion, TestResult, TestVariant } from "@/types";

const MOCK_BANANA_IMAGE_URL = "/mock/banana-image-1.svg";

function splitRanges(questionCount: number): [number, number][] {
  const minScore = questionCount;
  const maxScore = questionCount * 4;
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

function buildResults(topic: string, styleName: string, questionCount: number): TestResult[] {
  const ranges = splitRanges(questionCount);
  const titles = ["行动主导型", "稳态推进型", "谨慎评估型", "回避防御型"];
  return Array.from({ length: 4 }, (_, index) => ({
    id: `result-${index + 1}`,
    title: `${styleName}·${titles[index]}`,
    description: `你在“${topic}”中呈现该风格的典型特征。建议结合当前阶段做小步迭代，并持续复盘。`,
    cta: "保存结果并分享给朋友做对比。",
    scoreRange: ranges[index] ?? [questionCount, questionCount * 4]
  }));
}

function buildProjectionVariant(topic: string): TestVariant {
  const questions: TestQuestion[] = [
    {
      id: "q-1",
      title: `第一眼看到这张图，你最先注意到什么？`,
      subtitle: "按第一直觉选择，不要反复比较。",
      dimension: "潜意识投射",
      options: [
        { id: "q1-o1", text: "闭合圆形", scoreKey: "潜意识投射", score: 4 },
        { id: "q1-o2", text: "流动曲线", scoreKey: "潜意识投射", score: 3 },
        { id: "q1-o3", text: "面部轮廓", scoreKey: "潜意识投射", score: 2 },
        { id: "q1-o4", text: "背景阴影", scoreKey: "潜意识投射", score: 1 }
      ]
    }
  ];

  return {
    id: "mock-a",
    label: "A",
    styleKey: "image_projection",
    styleName: "第一眼图像投射型",
    textProvider: "local",
    textModel: "mock-template",
    imageProvider: "nano-banana",
    imageModel: "mock-image",
    headline: `第一眼看到什么？测出你的${topic}真实倾向`,
    description: `基于图像投射的快速测评，用第一直觉解读“${topic}”里的隐性偏好。`,
    coverTitle: `${topic}投射测试`,
    coverSubtitle: "看图 30 秒，按第一感觉选择。",
    questions,
    results: buildResults(topic, "图像投射", questions.length),
    imagePrompt: "mock image prompt",
    imageAspectRatio: "1:1",
    imageAssets: [
      {
        provider: "nano-banana",
        kind: "projection-core",
        prompt: "mock prompt",
        url: MOCK_BANANA_IMAGE_URL
      }
    ],
    hashtags: ["#图像投射", "#心理测试", "#第一眼", "#TestFlow"],
    dmScripts: ["你第一眼看到什么？来测一测。"],
    themeKey: "sunrise",
    psychologyBase: ["投射测验理论", "格式塔知觉理论"]
  };
}

function buildStoryVariant(topic: string): TestVariant {
  const scenes = ["森林", "房子", "门", "房间", "遇见的人"];
  const questions: TestQuestion[] = scenes.map((scene, index) => ({
    id: `q-${index + 1}`,
    title: `当你走到“${scene}”场景时，你会怎么做？`,
    subtitle: `围绕“${topic}”做最自然的选择。`,
    dimension: "剧情分支",
    options: [
      { id: `q${index + 1}-o1`, text: "主动探索", scoreKey: "剧情分支", score: 4 },
      { id: `q${index + 1}-o2`, text: "谨慎观察", scoreKey: "剧情分支", score: 3 },
      { id: `q${index + 1}-o3`, text: "寻求同伴", scoreKey: "剧情分支", score: 2 },
      { id: `q${index + 1}-o4`, text: "暂时回避", scoreKey: "剧情分支", score: 1 }
    ]
  }));

  return {
    id: "mock-b",
    label: "B",
    styleKey: "story_scene",
    styleName: "场景选择剧情型",
    textProvider: "local",
    textModel: "mock-template",
    headline: `${topic}剧情分支测评`,
    description: "通过连续场景选择，得到你的叙事人格画像。",
    coverTitle: `${topic}剧情心理测试`,
    coverSubtitle: "5 个剧情节点，逐步解锁你的倾向。",
    questions,
    results: buildResults(topic, "剧情分支", questions.length),
    hashtags: ["#剧情测试", "#叙事心理学", "#心理测试", "#TestFlow"],
    dmScripts: ["走完这条剧情线，看看你属于哪类人格。"],
    themeKey: "aurora",
    psychologyBase: ["荣格原型理论", "叙事心理学"]
  };
}

function buildAttachmentVariant(topic: string): TestVariant {
  const titles = [
    "对方回复慢时，你会？",
    "发生争执后，你通常？",
    "关系不确定时，你更倾向？",
    "想表达需求时，你会？",
    "被误解后，你会？",
    "亲密关系中你最在意？",
    "你更容易担心？",
    "当对方冷淡时，你会？",
    "面对亲密承诺时，你会？",
    "关系稳定后你通常？"
  ];
  const questions: TestQuestion[] = titles.map((title, index) => ({
    id: `q-${index + 1}`,
    title,
    subtitle: `请选择最符合你在“${topic}”中的状态。`,
    dimension: "依恋指数",
    options: [
      { id: `q${index + 1}-o1`, text: "几乎总是", scoreKey: "依恋指数", score: 4 },
      { id: `q${index + 1}-o2`, text: "经常如此", scoreKey: "依恋指数", score: 3 },
      { id: `q${index + 1}-o3`, text: "偶尔如此", scoreKey: "依恋指数", score: 2 },
      { id: `q${index + 1}-o4`, text: "很少如此", scoreKey: "依恋指数", score: 1 }
    ]
  }));

  return {
    id: "mock-c",
    label: "C",
    styleKey: "attachment_index",
    styleName: "情感依恋指数型",
    textProvider: "local",
    textModel: "mock-template",
    headline: `${topic}依恋指数测评`,
    description: "10题半量表结构，输出依恋类型与关系建议。",
    coverTitle: `${topic}依恋指数`,
    coverSubtitle: "10 题完成，获得你的关系画像。",
    questions,
    results: buildResults(topic, "依恋指数", questions.length),
    hashtags: ["#依恋类型", "#亲密关系", "#情感测试", "#TestFlow"],
    dmScripts: ["10 题测出你的依恋风格，来对比一下。"],
    themeKey: "meadow",
    psychologyBase: ["依恋理论", "情绪调节理论"]
  };
}

function buildPotentialVariant(topic: string): TestVariant {
  const titles = [
    "面对新机会，你通常？",
    "做重大决策时，你最重视？",
    "资源有限时，你会优先？",
    "遇到失败后，你更可能？",
    "你对长期成长的态度是？",
    "你最想提升的能力是？"
  ];
  const questions: TestQuestion[] = titles.map((title, index) => ({
    id: `q-${index + 1}`,
    title,
    subtitle: `围绕“${topic}”选择最贴近你的价值取向。`,
    dimension: "潜力路径",
    options: [
      { id: `q${index + 1}-o1`, text: "直接行动", scoreKey: "潜力路径", score: 4 },
      { id: `q${index + 1}-o2`, text: "稳步推进", scoreKey: "潜力路径", score: 3 },
      { id: `q${index + 1}-o3`, text: "理性评估", scoreKey: "潜力路径", score: 2 },
      { id: `q${index + 1}-o4`, text: "等待时机", scoreKey: "潜力路径", score: 1 }
    ]
  }));

  return {
    id: "mock-d",
    label: "D",
    styleKey: "life_potential",
    styleName: "人生潜力预测型",
    textProvider: "local",
    textModel: "mock-template",
    headline: `${topic}潜力路径测评`,
    description: "从价值观与选择偏好推断你的潜力增长路径。",
    coverTitle: `${topic}潜力雷达`,
    coverSubtitle: "6 题完成，拿到你的潜力发展建议。",
    questions,
    results: buildResults(topic, "潜力路径", questions.length),
    hashtags: ["#潜力测试", "#积极心理学", "#成长路径", "#TestFlow"],
    dmScripts: ["看看你的潜力路径在哪一象限。"],
    themeKey: "sunrise",
    psychologyBase: ["积极心理学", "自我效能感理论"]
  };
}

function buildMentalHealthVariant(topic: string): TestVariant {
  const titles = [
    "最近一周，你是否难以放松？",
    "最近一周，你是否经常失眠？",
    "最近一周，你是否容易烦躁？",
    "最近一周，你是否难以集中？",
    "最近一周，你是否持续内耗？",
    "最近一周，你是否回避社交？",
    "最近一周，你是否情绪低落？",
    "最近一周，你是否过度担忧？",
    "最近一周，你是否感到精力不足？"
  ];
  const questions: TestQuestion[] = titles.map((title, index) => ({
    id: `q-${index + 1}`,
    title,
    subtitle: `请根据“${topic}”相关近期状态作答。`,
    dimension: "心理自评",
    options: [
      { id: `q${index + 1}-o1`, text: "几乎每天", scoreKey: "心理自评", score: 4 },
      { id: `q${index + 1}-o2`, text: "一周数次", scoreKey: "心理自评", score: 3 },
      { id: `q${index + 1}-o3`, text: "偶尔出现", scoreKey: "心理自评", score: 2 },
      { id: `q${index + 1}-o4`, text: "很少出现", scoreKey: "心理自评", score: 1 }
    ]
  }));

  return {
    id: "mock-e",
    label: "E",
    styleKey: "mental_health_check",
    styleName: "心理健康自评型",
    textProvider: "local",
    textModel: "mock-template",
    headline: `${topic}心理状态自评`,
    description: "温和陪伴式自评结构，输出风险等级与调节建议。",
    coverTitle: `${topic}状态检查`,
    coverSubtitle: "9 题完成，获取你的压力与调节建议。",
    questions,
    results: buildResults(topic, "心理自评", questions.length),
    hashtags: ["#心理健康", "#自评测试", "#情绪管理", "#TestFlow"],
    dmScripts: ["做个 9 题自评，看看最近状态。"],
    themeKey: "aurora",
    psychologyBase: ["CBT", "压力-应对模型"]
  };
}

export function buildMockGeneratedTest(topic: string, count: number): GeneratedTest {
  const safeTopic = topic.trim() || "隐藏人格类型";
  const variants = [
    buildProjectionVariant(safeTopic),
    buildStoryVariant(safeTopic),
    buildAttachmentVariant(safeTopic),
    buildPotentialVariant(safeTopic),
    buildMentalHealthVariant(safeTopic)
  ];

  const safeCount = Math.max(1, Math.min(5, Math.floor(count)));
  return {
    id: crypto.randomUUID(),
    topic: safeTopic,
    createdAt: new Date().toISOString(),
    variants: variants.slice(0, safeCount)
  };
}
