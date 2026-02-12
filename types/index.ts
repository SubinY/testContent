export interface TestOption {
  id: string;
  text: string;
  scoreKey: string;
  score: number;
  scoreVector?: Record<string, number>;
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
  headline: string;
  description: string;
  coverTitle: string;
  coverSubtitle: string;
  questions: TestQuestion[];
  results: TestResult[];
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
