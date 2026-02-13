export interface TestOption {
  id: string;
  text: string;
  scoreKey: string;
  score: number;
  scoreVector?: Record<string, number>;
}

export type SensoryChannel = "visual" | "auditory" | "tactile" | "kinesthetic" | "mixed";
export type EmotionalTone = "positive" | "negative" | "neutral" | "ambivalent";
export type BehavioralTendency = "approach" | "avoidance" | "control" | "submission";
export type TimeOrientation = "past" | "present" | "future";
export type AssessmentGoal = "predictive" | "descriptive" | "projective" | "entertainment";
export type TheoryFitLevel = "high" | "moderate" | "low";

export interface TopicDeconstructionSurfaceImagery {
  concreteElements: string[];
  sensoryChannel: SensoryChannel;
  emotionalTone: EmotionalTone;
}

export interface TopicDeconstructionDeepConstruct {
  abstractConcept: string;
  behavioralTendency: BehavioralTendency;
  timeOrientation: TimeOrientation;
}

export interface TopicDeconstruction {
  surfaceImagery: TopicDeconstructionSurfaceImagery;
  deepConstruct: TopicDeconstructionDeepConstruct;
  assessmentGoal: AssessmentGoal;
}

export interface TopicTheoryItem {
  name: string;
  applicationLogic: string;
}

export interface TopicDimension {
  name: string;
  definition: string;
  theoryBase: string;
  indicatorType: "behavioral" | "self-report" | "projective";
  expectedDistribution: "normal" | "skewed" | "bimodal";
}

export interface TopicFrameworkConfidence {
  level: TheoryFitLevel;
  reasoning: string;
  validityThreats: string[];
  scope: string;
}

export interface TopicTheoryFramework {
  primaryTheories: TopicTheoryItem[];
  dimensions: TopicDimension[];
  confidence: TopicFrameworkConfidence;
}

export interface TopicFormConstraints {
  recommendedStyles: string[];
  allowedStyleKeys?: string[];
  styleAdaptationNotes: string;
  specialConsiderations: string[];
}

export interface TopicAnalysis {
  topicType?: "fictional" | "extreme_real" | "abstract" | "general";
  deconstruction: TopicDeconstruction;
  theoryFramework: TopicTheoryFramework;
  formConstraints: TopicFormConstraints;
}

export interface TestQuestion {
  id: string;
  title: string;
  subtitle: string;
  dimension?: string;
  options: TestOption[];
}

export interface TestResult {
  id: string;
  title: string;
  description: string;
  cta: string;
  scoreRange: [number, number];
}

export interface TestVariant {
  id: string;
  label: string;
  styleKey?: string;
  styleName?: string;
  textProvider?: "openai" | "deepseek" | "local";
  textModel?: string;
  imageProvider?: "nano-banana";
  imageModel?: string;
  headline: string;
  description: string;
  coverTitle: string;
  coverSubtitle: string;
  questions: TestQuestion[];
  results: TestResult[];
  imagePrompt?: string;
  imageAspectRatio?: string;
  imageAssets?: Array<{
    provider: "nano-banana";
    kind: "projection-core";
    prompt: string;
    url: string;
  }>;
  hashtags: string[];
  dmScripts: string[];
  themeKey: string;
  psychologyBase?: string[];
  copyPackage?: {
    titles: string[];
    content: string[];
    hashtags: string[];
    dmScripts: string[];
  };
}

export interface GeneratedTest {
  id: string;
  topic: string;
  createdAt: string;
  topicAnalysis?: TopicAnalysis;
  variants: TestVariant[];
}

export interface GenerateSseEventProgress {
  status: "progress";
  progress: number;
  message: string;
}

export interface GenerateSseEventVariant {
  status: "variant";
  index: number;
  total: number;
  variant: TestVariant;
}

export interface GenerateSseEventDone {
  status: "done";
  test: GeneratedTest;
}

export interface GenerateSseEventError {
  status: "error";
  message: string;
}

export type LlmProviderSelection = "auto" | "openai" | "deepseek" | "local";

export type GenerateSseEvent =
  | GenerateSseEventProgress
  | GenerateSseEventVariant
  | GenerateSseEventDone
  | GenerateSseEventError;
