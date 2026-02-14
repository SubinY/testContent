import type { ImageGenerateClient, ImageGenerateInput } from "@/lib/image/types";

interface ModelGateImageResponse {
  status?: string;
  data?: Array<{
    url?: string;
    b64_json?: string;
    /** ModelGate 文档：base64 时返回 data[].content，值为 data:image/png;base64,... */
    content?: string;
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
  if (typeof first.content === "string" && first.content.length > 0) {
    return first.content.startsWith("data:") ? first.content : `data:image/${format};base64,${first.content}`;
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
  /** 文档：url 返回图片地址，base64 返回 data[].content；国内推荐 base64 下载加速 */
  private readonly outputType: "url" | "base64";

  constructor(params?: {
    apiKey?: string;
    url?: string;
    model?: string;
    size?: string;
    outputFormat?: string;
    outputType?: "url" | "base64";
  }) {
    this.apiKey = params?.apiKey ?? process.env.MODELGATE_IMAGE_API_KEY ?? process.env.MODELGATE_API_KEY;
    this.url = params?.url ?? process.env.MODELGATE_IMAGE_URL ?? "https://mg.aid.pub/api/v1/images/generations";
    this.model = params?.model ?? process.env.MODELGATE_IMAGE_MODEL ?? "google/nano-banana";
    this.defaultSize = params?.size ?? process.env.MODELGATE_IMAGE_SIZE ?? "1024x1024";
    this.outputFormat = params?.outputFormat ?? process.env.MODELGATE_IMAGE_OUTPUT_FORMAT ?? "png";
    const outType = params?.outputType ?? process.env.MODELGATE_IMAGE_OUTPUT_TYPE ?? "url";
    this.outputType = outType === "base64" ? "base64" : "url";
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
          output_type: this.outputType,
          output_format: this.outputFormat
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const reason = await response.text().catch(() => "");
        throw new Error(`ModelGate image request failed: ${response.status} ${reason}`.trim());
      }

      const payload = (await response.json().catch(() => null)) as unknown;
      const res = payload as { status?: string; message?: { error?: { message?: string } } };
      if (res?.status === "error") {
        const msg = res.message?.error?.message ?? (typeof res.message === "string" ? res.message : "ModelGate image error");
        throw new Error(msg);
      }
      return extractImageUrlFromResponse(payload, this.outputFormat);
    } finally {
      clearTimeout(timer);
    }
  }
}
