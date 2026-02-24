export interface TestOption {
  id: string;
  text: string;
  scoreKey: string;
  score: number;
  scoreVector?: Record<string, number>;
}

export interface DailyContent {
  date: string;
  shortTheme: string;
  fullContent: string;
  sources: DailySource[];
  generatedAt: string;
}

export interface DailySource {
  name: string;
  url: string;
  titles: string[];
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
  generationSource?: "remote" | "remote-rewrite" | "local-fallback" | "local-mode";
  textProvider?: "openai" | "deepseek" | "modelgate" | "local";
  textModel?: string;
  rawModelOutput?: string;
  imageProvider?: "nano-banana" | "modelgate";
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
    provider: "nano-banana" | "modelgate";
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

export interface VariantGenerationFailure {
  label: string;
  styleName?: string;
  error: string;
  attemptAt: string;
}

export interface GeneratedTest {
  id: string;
  topic: string;
  createdAt: string;
  topicAnalysis?: TopicAnalysis;
  debugTrace?: DebugEntry[];
  variants: TestVariant[];
  successCount?: number;
  failureCount?: number;
  failures?: VariantGenerationFailure[];
}

export interface DebugEntry {
  id: string;
  at: string;
  stage: string;
  source: "api" | "llm" | "image" | "fallback" | "ui";
  provider?: string;
  model?: string;
  variantLabel?: string;
  message: string;
  payload?: string;
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

export interface GenerateSseEventDebug {
  status: "debug";
  entry: DebugEntry;
}

export type LlmProviderSelection = "auto" | "openai" | "deepseek" | "modelgate" | "local";

export type GenerateSseEvent =
  | GenerateSseEventProgress
  | GenerateSseEventVariant
  | GenerateSseEventDone
  | GenerateSseEventDebug
  | GenerateSseEventError;

export interface ApiError {
  code: "INVALID_PARAMS" | "LLM_ERROR" | "STORAGE_ERROR" | "UNKNOWN_ERROR";
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface GenerateParams {
  topic: string;
  count?: number;
  enableImageVariants?: boolean;
  strictRemote?: boolean;
  qualityGateEnabled?: boolean;
  provider?: LlmProviderSelection;
  variantInputMode?: "draw" | "select";
  selectedVariantLabel?: "A" | "B" | "C" | "D" | "E";
}

export interface GenerateResult {
  test: GeneratedTest;
}

export interface XiaohongshuVariantInput {
  headline?: string;
  description?: string;
  coverTitle?: string;
  coverSubtitle?: string;
  styleName?: string;
  label: string;
  hashtags: string[];
  questions: Array<{ title: string }>;
  results: Array<{ title: string; description: string }>;
}

export interface XiaohongshuGenerateParams {
  topic: string;
  provider?: LlmProviderSelection;
  variant: XiaohongshuVariantInput;
}

export interface XiaohongshuGenerateResult {
  title: string;
  body: string;
  hashtags: string[];
  source: "remote" | "fallback";
  compliancePromptPath: string;
}
