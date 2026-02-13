export type LlmProviderName = "openai" | "deepseek" | "modelgate" | "local";

export interface LlmGenerateInput {
  systemPrompt: string;
  userPrompt: string;
  timeoutMs: number;
}

export interface LlmGenerateResult {
  content: string;
  provider: LlmProviderName;
  model: string;
}

export interface LlmProvider {
  readonly provider: LlmProviderName;
  readonly model: string;
  isAvailable(): boolean;
  generate(input: LlmGenerateInput): Promise<LlmGenerateResult>;
}
