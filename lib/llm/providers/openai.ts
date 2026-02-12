import OpenAI from "openai";

import type { LlmGenerateInput, LlmGenerateResult, LlmProvider } from "@/lib/llm/types";

export class OpenAiProvider implements LlmProvider {
  readonly provider = "openai" as const;
  readonly model: string;
  private readonly client: OpenAI | null;

  constructor(params?: { apiKey?: string; model?: string; baseURL?: string }) {
    const apiKey = params?.apiKey ?? process.env.OPENAI_API_KEY;
    this.model = params?.model ?? process.env.OPENAI_MODEL ?? "gpt-4-turbo-preview";
    this.client = apiKey ? new OpenAI({ apiKey, baseURL: params?.baseURL }) : null;
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async generate(input: LlmGenerateInput): Promise<LlmGenerateResult> {
    if (!this.client) {
      throw new Error("OPENAI_API_KEY is missing");
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), input.timeoutMs);
    try {
      const completion = await this.client.chat.completions.create(
        {
          model: this.model,
          response_format: { type: "json_object" },
          temperature: 0.7,
          messages: [
            { role: "system", content: input.systemPrompt },
            { role: "user", content: input.userPrompt }
          ]
        },
        { signal: controller.signal }
      );

      return {
        content: completion.choices[0]?.message?.content ?? "{}",
        provider: this.provider,
        model: this.model
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
