import type {
  AssessmentGoal,
  BehavioralTendency,
  EmotionalTone,
  SensoryChannel,
  TheoryFitLevel,
  TimeOrientation,
  TopicAnalysis,
  TopicDimension,
  TopicTheoryItem
} from "@/types";

interface TheoryTool {
  feature: string;
  theories: TopicTheoryItem[];
}

const THEORY_TOOLBOX: TheoryTool[] = [
  {
    feature: "self_future",
    theories: [
      {
        name: "可能自我理论（Possible Selves）",
        applicationLogic: "用于解释用户对理想自我与风险自我的心理张力，适合自我想象类主题。"
      }
    ]
  },
  {
    feature: "decision",
    theories: [
      {
        name: "双系统理论（Dual Process）",
        applicationLogic: "用于区分直觉反应与理性推演路径，匹配选择与冲突决策主题。"
      },
      {
        name: "前景理论（Prospect Theory）",
        applicationLogic: "用于解释损失厌恶与风险偏好变化，适合高不确定决策语境。"
      }
    ]
  },
  {
    feature: "risk",
    theories: [
      {
        name: "风险感知理论（Risk Perception）",
        applicationLogic: "用于刻画风险敏感度与威胁放大效应，适配安全/生存类主题。"
      }
    ]
  },
  {
    feature: "relationship",
    theories: [
      {
        name: "依恋理论（Attachment Theory）",
        applicationLogic: "用于识别亲密关系中的焦虑-回避模式，适用于关系触发情境。"
      }
    ]
  },
  {
    feature: "stress",
    theories: [
      {
        name: "应激-应对理论（Stress-Coping）",
        applicationLogic: "用于解释高压场景下的应对策略与恢复路径，适用于极端现实主题。"
      },
      {
        name: "心理韧性理论（Resilience）",
        applicationLogic: "用于评估受挫后的恢复能力与复原资源，支持发展性建议输出。"
      }
    ]
  },
  {
    feature: "narrative",
    theories: [
      {
        name: "叙事心理学（Narrative Psychology）",
        applicationLogic: "用于将隐喻化主题转为可解释的人生叙事倾向，适配极端虚构主题。"
      }
    ]
  },
  {
    feature: "control",
    theories: [
      {
        name: "控制点理论（Locus of Control）",
        applicationLogic: "用于判断用户倾向内控还是外控归因，解释行动延迟或主动策略。"
      },
      {
        name: "自我效能理论（Self-Efficacy）",
        applicationLogic: "用于估计执行信念与行动坚持概率，适合副业/成长类主题。"
      }
    ]
  }
];

function normalizeTopic(topic: string): string {
  return topic.trim().slice(0, 120);
}

function pickSensoryChannel(topic: string): SensoryChannel {
  if (/(看|图|画|视觉|颜色|第一眼)/.test(topic)) {
    return "visual";
  }
  if (/(听|声音|语音|噪音)/.test(topic)) {
    return "auditory";
  }
  if (/(触|痛|冷热|身体|体感)/.test(topic)) {
    return "tactile";
  }
  if (/(跑|逃|动|行动|节奏)/.test(topic)) {
    return "kinesthetic";
  }
  return "mixed";
}

function pickEmotionalTone(topic: string): EmotionalTone {
  if (/(焦虑|压力|生存|破产|失败|恐惧|崩溃)/.test(topic)) {
    return "negative";
  }
  if (/(成长|机会|潜力|成功|希望|提升)/.test(topic)) {
    return "positive";
  }
  if (/(但是|纠结|矛盾|又想|又怕)/.test(topic)) {
    return "ambivalent";
  }
  return "neutral";
}

function pickBehavioralTendency(topic: string): BehavioralTendency {
  if (/(逃离|回避|躲|离开|拖延)/.test(topic)) {
    return "avoidance";
  }
  if (/(控制|规划|掌控|管理)/.test(topic)) {
    return "control";
  }
  if (/(顺从|迎合|服从)/.test(topic)) {
    return "submission";
  }
  return "approach";
}

function pickTimeOrientation(topic: string): TimeOrientation {
  if (/(过去|曾经|小时候|以前|复盘)/.test(topic)) {
    return "past";
  }
  if (/(未来|预测|可能|潜力|副业|长期)/.test(topic)) {
    return "future";
  }
  return "present";
}

function pickAssessmentGoal(topic: string): AssessmentGoal {
  if (/(指数|类型|测评|测试|画像|倾向)/.test(topic)) {
    return "descriptive";
  }
  if (/(概率|预测|生存率|成功率)/.test(topic)) {
    return "predictive";
  }
  if (/(第一眼|图像|梦|潜意识|投射)/.test(topic)) {
    return "projective";
  }
  return "entertainment";
}

function classifyTopic(topic: string): "fictional" | "extreme_real" | "abstract" | "general" {
  if (/(变成|火星|外星|超能力|魔法|猫的概率)/.test(topic)) {
    return "fictional";
  }
  if (/(参军|打仗|生存率|破产概率|死亡|犯罪)/.test(topic)) {
    return "extreme_real";
  }
  if (/(副业|逃离城市|可能性|选择困难|方向)/.test(topic)) {
    return "abstract";
  }
  return "general";
}

function deriveFeatures(topic: string, category: ReturnType<typeof classifyTopic>): string[] {
  const featureSet = new Set<string>();
  if (/(我|身份|自己|未来|理想)/.test(topic)) {
    featureSet.add("self_future");
  }
  if (/(选择|决策|取舍|是否|概率)/.test(topic)) {
    featureSet.add("decision");
  }
  if (/(风险|生存|安全|危机|破产)/.test(topic)) {
    featureSet.add("risk");
  }
  if (/(关系|依恋|亲密|沟通|伴侣)/.test(topic)) {
    featureSet.add("relationship");
  }
  if (/(压力|应对|抗压|挑战)/.test(topic)) {
    featureSet.add("stress");
  }
  if (/(控制|执行|行动|计划|副业)/.test(topic)) {
    featureSet.add("control");
  }
  if (category === "fictional") {
    featureSet.add("narrative");
  }
  if (category === "extreme_real") {
    featureSet.add("stress");
    featureSet.add("risk");
  }
  if (category === "abstract") {
    featureSet.add("control");
    featureSet.add("self_future");
  }

  const output = Array.from(featureSet);
  return output.length > 0 ? output.slice(0, 3) : ["self_future", "decision"];
}

function pickPrimaryTheories(features: string[]): TopicTheoryItem[] {
  const theories = features
    .flatMap((feature) => THEORY_TOOLBOX.find((item) => item.feature === feature)?.theories ?? [])
    .slice(0, 3);
  return theories.length > 0 ? theories : THEORY_TOOLBOX[0].theories;
}

function buildDimensions(topic: string, theories: TopicTheoryItem[], goal: AssessmentGoal): TopicDimension[] {
  const base: TopicDimension[] = theories.map((theory, index) => {
    const indicatorType = goal === "projective" ? "projective" : goal === "descriptive" ? "self-report" : "behavioral";
    return {
      name: index === 0 ? "核心驱动倾向" : index === 1 ? "风险与决策权衡" : "执行与恢复能力",
      definition:
        index === 0
          ? `围绕“${topic}”时你最稳定的心理推进机制。`
          : index === 1
            ? `在“${topic}”相关冲突中，你如何平衡收益与风险。`
            : `面对“${topic}”阻力时的行动坚持与修复策略。`,
      theoryBase: theory.name,
      indicatorType,
      expectedDistribution: index === 1 ? "bimodal" : "normal"
    };
  });

  return base.slice(0, 3);
}

function buildConfidence(
  category: ReturnType<typeof classifyTopic>,
  theories: TopicTheoryItem[]
): { level: TheoryFitLevel; reasoning: string; validityThreats: string[]; scope: string } {
  if (category === "fictional") {
    return {
      level: "low",
      reasoning: "主题高度隐喻化，理论用于创意解释而非真实预测，需明确娱乐属性。",
      validityThreats: ["隐喻解释主观性高", "用户将娱乐结果误读为科学结论"],
      scope: "适用于创意内容生产与社交传播，不适用于真实决策或医学判断。"
    };
  }
  if (category === "extreme_real") {
    return {
      level: "moderate",
      reasoning: "理论可解释应对风格，但不支持个体真实概率预测，需伦理免责声明。",
      validityThreats: ["高压情境下社会赞许性偏差", "用户把心理画像等同真实风险结论"],
      scope: "适用于心理倾向自评与内容创作，不适用于军事、金融或生命安全预测。"
    };
  }
  return {
    level: theories.length >= 2 ? "high" : "moderate",
    reasoning: "主题与所选理论具备可解释映射关系，能够支持结构化测评内容生成。",
    validityThreats: ["自陈偏差", "场景语言导致表面效度过高"],
    scope: "适用于内容创作与轻量心理倾向探索，不替代临床诊断。"
  };
}

function buildStyleRecommendation(category: ReturnType<typeof classifyTopic>, goal: AssessmentGoal): string[] {
  if (category === "fictional") {
    return ["图像投射型", "场景剧情型"];
  }
  if (category === "extreme_real") {
    return ["场景剧情型", "人生潜力型"];
  }
  if (goal === "projective") {
    return ["图像投射型", "场景剧情型", "情感依恋指数型"];
  }
  return ["场景剧情型", "情感依恋指数型", "人生潜力型", "心理健康自评型"];
}

function extractConcreteElements(topic: string): string[] {
  const matched = topic.match(/[\u4e00-\u9fa5A-Za-z0-9]{2,8}/g) ?? [];
  const unique = Array.from(new Set(matched.map((item) => item.trim()).filter((item) => item.length >= 2)));
  return unique.slice(0, 5);
}

export function buildTopicAnalysis(inputTopic: string): TopicAnalysis {
  const topic = normalizeTopic(inputTopic);
  const category = classifyTopic(topic);
  const features = deriveFeatures(topic, category);
  const primaryTheories = pickPrimaryTheories(features);
  const assessmentGoal = pickAssessmentGoal(topic);
  const confidence = buildConfidence(category, primaryTheories);

  const specialConsiderations: string[] = [];
  if (category === "fictional") {
    specialConsiderations.push("强制娱乐化解释，避免概率化结论。");
  }
  if (category === "extreme_real") {
    specialConsiderations.push("自动附加伦理免责声明，禁止真实概率预测。");
  }
  if (assessmentGoal === "predictive") {
    specialConsiderations.push("结果表达为心理倾向，不输出现实准确率。");
  }
  if (category === "abstract") {
    specialConsiderations.push("结果需提供行动阶梯，给出从当前到目标的渐进路径。");
  }

  return {
    topicType: category,
    deconstruction: {
      surfaceImagery: {
        concreteElements: extractConcreteElements(topic),
        sensoryChannel: pickSensoryChannel(topic),
        emotionalTone: pickEmotionalTone(topic)
      },
      deepConstruct: {
        abstractConcept:
          category === "fictional"
            ? "隐喻化身份与自主性探索"
            : category === "extreme_real"
              ? "高压决策下的风险应对机制"
              : "目标冲突下的动机与执行机制",
        behavioralTendency: pickBehavioralTendency(topic),
        timeOrientation: pickTimeOrientation(topic)
      },
      assessmentGoal
    },
    theoryFramework: {
      primaryTheories,
      dimensions: buildDimensions(topic, primaryTheories, assessmentGoal),
      confidence
    },
    formConstraints: {
      recommendedStyles: buildStyleRecommendation(category, assessmentGoal),
      allowedStyleKeys:
        category === "fictional"
          ? ["image_projection", "story_scene"]
          : category === "extreme_real"
            ? ["story_scene"]
            : undefined,
      styleAdaptationNotes:
        category === "fictional"
          ? "采用隐喻叙事与原型意象，结论标注低置信度。"
          : category === "extreme_real"
            ? "采用高压场景选择题并强调伦理边界，结论仅描述应对风格。"
            : "按维度映射题目结构，保持理论层与展示层解耦。",
      specialConsiderations
    }
  };
}
