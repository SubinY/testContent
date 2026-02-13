import type { ImageGenerateClient, ImageGenerateInput } from "@/lib/image/types";

interface ModelGateImageResponse {
  data?: Array<{
    url?: string;
    b64_json?: string;
  }>;
  url?: string;
  b64_json?: string;
  image?: string;
}

function extractImageUrlFromResponse(payload: unknown, format: string): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const data = payload as ModelGateImageResponse;

  if (typeof data.url === "string" && data.url.length > 0) {
    return data.url;
  }
  if (typeof data.b64_json === "string" && data.b64_json.length > 0) {
    return `data:image/${format};base64,${data.b64_json}`;
  }
  if (typeof data.image === "string" && data.image.length > 0) {
    return data.image.startsWith("http") ? data.image : `data:image/${format};base64,${data.image}`;
  }

  const first = Array.isArray(data.data) ? data.data[0] : undefined;
  if (!first) {
    return null;
  }
  if (typeof first.url === "string" && first.url.length > 0) {
    return first.url;
  }
  if (typeof first.b64_json === "string" && first.b64_json.length > 0) {
    return `data:image/${format};base64,${first.b64_json}`;
  }
  return null;
}

export class ModelGateImageClient implements ImageGenerateClient {
  readonly provider = "modelgate" as const;
  readonly model: string;
  private readonly apiKey: string | undefined;
  private readonly url: string;
  private readonly defaultSize: string;
  private readonly outputFormat: string;

  constructor(params?: { apiKey?: string; url?: string; model?: string; size?: string; outputFormat?: string }) {
    this.apiKey = params?.apiKey ?? process.env.MODELGATE_IMAGE_API_KEY ?? process.env.MODELGATE_API_KEY;
    this.url = params?.url ?? process.env.MODELGATE_IMAGE_URL ?? "https://mg.aid.pub/api/v1/images/generations";
    this.model = params?.model ?? process.env.MODELGATE_IMAGE_MODEL ?? "Nano-Banana";
    this.defaultSize = params?.size ?? process.env.MODELGATE_IMAGE_SIZE ?? "1024x1024";
    this.outputFormat = params?.outputFormat ?? process.env.MODELGATE_IMAGE_OUTPUT_FORMAT ?? "png";
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async generate(input: ImageGenerateInput): Promise<string | null> {
    if (!this.apiKey) {
      throw new Error("MODELGATE_IMAGE_API_KEY or MODELGATE_API_KEY is missing");
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), input.timeoutMs ?? 60_000);

    try {
      const response = await fetch(this.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          prompt: input.prompt,
          size: input.imageSize ?? this.defaultSize,
          output_type: "base64",
          output_format: this.outputFormat
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const reason = await response.text().catch(() => "");
        throw new Error(`ModelGate image request failed: ${response.status} ${reason}`.trim());
      }

      const payload = (await response.json().catch(() => null)) as unknown;
      return extractImageUrlFromResponse(payload, this.outputFormat);
    } finally {
      clearTimeout(timer);
    }
  }
}
