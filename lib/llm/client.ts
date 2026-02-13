import { DeepSeekProvider } from "@/lib/llm/providers/deepseek";
import { ModelGateProvider } from "@/lib/llm/providers/modelgate";
import { OpenAiProvider } from "@/lib/llm/providers/openai";
import type { LlmGenerateInput, LlmProvider, LlmProviderName } from "@/lib/llm/types";

export interface LlmClientOptions {
  preferredProvider?: LlmProviderName | "auto";
}

interface GenerationResult {
  content: string;
  provider: LlmProviderName;
  model: string;
}

function resolveProviderOrder(preferred: LlmClientOptions["preferredProvider"]): LlmProviderName[] {
  if (preferred === "local") {
    return [];
  }
  if (preferred === "modelgate") {
    return ["modelgate"];
  }
  if (preferred === "openai") {
    return ["openai"];
  }
  if (preferred === "deepseek") {
    return ["deepseek"];
  }
  return ["modelgate", "deepseek", "openai"];
}

type PreferredProvider = LlmProviderName | "auto";

function normalizePreferredProvider(value: string | undefined): PreferredProvider {
  if (value === "openai" || value === "deepseek" || value === "modelgate" || value === "local" || value === "auto") {
    return value;
  }
  return "auto";
}

export function getPreferredProviderFromEnv(override?: string): PreferredProvider {
  return normalizePreferredProvider(override ?? process.env.LLM_PROVIDER);
}

function createProvider(name: LlmProviderName): LlmProvider | null {
  if (name === "openai") {
    return new OpenAiProvider();
  }
  if (name === "deepseek") {
    return new DeepSeekProvider();
  }
  if (name === "modelgate") {
    return new ModelGateProvider();
  }
  return null;
}

export class UnifiedLlmClient {
  private readonly providers: LlmProvider[];

  constructor(options?: LlmClientOptions) {
    const preferred = options?.preferredProvider ?? getPreferredProviderFromEnv();
    const order = resolveProviderOrder(preferred);
    this.providers = order.map((providerName) => createProvider(providerName)).filter(Boolean) as LlmProvider[];
  }

  hasRemoteProvider(): boolean {
    return this.providers.some((provider) => provider.isAvailable());
  }

  async generate(input: LlmGenerateInput): Promise<GenerationResult> {
    const errors: string[] = [];

    for (const provider of this.providers) {
      if (!provider.isAvailable()) {
        continue;
      }

      try {
        const response = await provider.generate(input);
        return {
          content: response.content,
          provider: response.provider,
          model: response.model
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown provider error";
        errors.push(`${provider.provider}: ${message}`);
      }
    }

    throw new Error(errors.length > 0 ? errors.join(" | ") : "No available LLM provider");
  }
}
