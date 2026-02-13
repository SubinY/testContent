import type { TestVariant } from "@/types";

export interface NanoBananaGenerateInput {
  prompt: string;
  aspectRatio?: string;
  imageSize?: string;
  timeoutMs?: number;
}

interface NanoBananaResultItem {
  url?: string;
  content?: string;
}

interface NanoBananaTaskResult {
  id?: string;
  results?: NanoBananaResultItem[];
  progress?: number;
  status?: string;
  failure_reason?: string;
  error?: string;
}

interface NanoBananaWrappedResponse {
  code?: number;
  msg?: string;
  data?: NanoBananaTaskResult;
}

function parseJsonObject(input: string): unknown {
  const trimmed = input.trim();
  if (!trimmed) {
    return {};
  }

  const lines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  let lastParsed: unknown = null;
  for (const line of lines) {
    const candidate = line.startsWith("data:") ? line.slice(5).trim() : line;
    try {
      lastParsed = JSON.parse(candidate);
    } catch {
      // noop
    }
  }
  if (lastParsed && typeof lastParsed === "object") {
    return lastParsed;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        return {};
      }
    }
  }

  return {};
}

function normalizeTaskResult(raw: unknown): NanoBananaTaskResult {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const asObject = raw as Record<string, unknown>;
  if (asObject.data && typeof asObject.data === "object") {
    const wrapped = raw as NanoBananaWrappedResponse;
    return (wrapped.data ?? {}) as NanoBananaTaskResult;
  }

  return raw as NanoBananaTaskResult;
}

export class NanoBananaClient {
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(params?: { apiKey?: string; baseUrl?: string; model?: string }) {
    this.apiKey = params?.apiKey ?? process.env.NANO_BANANA_API_KEY;
    this.baseUrl = (params?.baseUrl ?? process.env.NANO_BANANA_BASE_URL ?? "https://grsai.dakka.com.cn").replace(
      /\/+$/,
      ""
    );
    this.model = params?.model ?? process.env.NANO_BANANA_MODEL ?? "nano-banana-fast";
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async generate(input: NanoBananaGenerateInput): Promise<string | null> {
    if (!this.apiKey) {
      throw new Error("NANO_BANANA_API_KEY is missing");
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), input.timeoutMs ?? 60_000);

    try {
      const response = await fetch(`${this.baseUrl}/v1/draw/nano-banana`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          prompt: input.prompt,
          aspectRatio: input.aspectRatio ?? process.env.NANO_BANANA_ASPECT_RATIO ?? "auto",
          imageSize: input.imageSize ?? process.env.NANO_BANANA_IMAGE_SIZE ?? "1K",
          shutProgress: true
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const reason = await response.text().catch(() => "");
        throw new Error(`Nano Banana request failed: ${response.status} ${reason}`.trim());
      }

      const raw = await response.text();
      const parsed = parseJsonObject(raw);
      const task = normalizeTaskResult(parsed);

      if (task.status && task.status !== "succeeded" && task.failure_reason) {
        throw new Error(`Nano Banana failed: ${task.failure_reason}`);
      }

      const url = task.results?.find((item) => typeof item.url === "string" && item.url.length > 0)?.url ?? null;
      return url;
    } finally {
      clearTimeout(timer);
    }
  }
}

export function attachGeneratedImage(
  variant: TestVariant,
  imageUrl: string | null,
  prompt: string
): TestVariant {
  if (!imageUrl) {
    return variant;
  }

  return {
    ...variant,
    imageAssets: [
      ...(variant.imageAssets ?? []),
      {
        provider: "nano-banana",
        kind: "projection-core",
        prompt,
        url: imageUrl
      }
    ]
  };
}
