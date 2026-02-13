import { z } from "zod";

import { attachGeneratedImage, NanoBananaClient } from "@/lib/image/nano-banana";
import { getPreferredProviderFromEnv, UnifiedLlmClient } from "@/lib/llm/client";
import {
  buildNanoBananaPrompt,
  buildSystemPrompt,
  buildUserPrompt,
  generateLocalVariant,
  parseModelJson,
  repairVariantPayload,
  sampleAssessmentStyles,
  type AssessmentStyle
} from "@/lib/prompts";
import type { GeneratedTest, GenerateSseEvent, LlmProviderSelection, TestVariant } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  topic: z.string().trim().min(2).max(120),
  count: z.number().int().min(1).max(5),
  provider: z.enum(["auto", "openai", "deepseek", "local"]).optional()
});

const encoder = new TextEncoder();

function toSseChunk(event: GenerateSseEvent): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function createVariantWithProvider(params: {
  client: UnifiedLlmClient;
  topic: string;
  label: string;
  style: AssessmentStyle;
  variantIndex: number;
  forceLocal: boolean;
  imageClient: NanoBananaClient;
}): Promise<TestVariant> {
  const { client, topic, label, style, variantIndex, forceLocal, imageClient } = params;
  const imageModel = process.env.NANO_BANANA_MODEL ?? "nano-banana-fast";

  const withImageMeta = async (base: TestVariant): Promise<TestVariant> => {
    const imagePrompt = base.imagePrompt ?? buildNanoBananaPrompt(topic, style);
    if (!imagePrompt || !imageClient.isAvailable()) {
      return base;
    }
    try {
      const imageUrl = await imageClient.generate({
        prompt: imagePrompt,
        aspectRatio: base.imageAspectRatio,
        timeoutMs: 60_000
      });
      const withImage = attachGeneratedImage(base, imageUrl, imagePrompt);
      if (!imageUrl) {
        return withImage;
      }
      return {
        ...withImage,
        imageProvider: "nano-banana",
        imageModel
      };
    } catch {
      return base;
    }
  };

  if (forceLocal || !client.hasRemoteProvider()) {
    const localVariant = generateLocalVariant(topic, label, variantIndex, style);
    const withMeta: TestVariant = {
      ...localVariant,
      textProvider: "local",
      textModel: "local-template"
    };
    return withImageMeta(withMeta);
  }

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await client.generate({
        systemPrompt: buildSystemPrompt(label, style),
        userPrompt: buildUserPrompt(topic, label, style),
        timeoutMs: 30_000
      });
      const parsedPayload = parseModelJson(response.content);
      const repaired = repairVariantPayload(parsedPayload, {
        topic,
        label,
        variantIndex,
        style
      });
      const withMeta: TestVariant = {
        ...repaired,
        textProvider: response.provider,
        textModel: response.model
      };
      return withImageMeta(withMeta);
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await delay(attempt * 500);
      }
    }
  }

  if (lastError) {
    const localFallback: TestVariant = {
      ...generateLocalVariant(topic, label, variantIndex, style),
      textProvider: "local",
      textModel: "local-template"
    };
    return withImageMeta(localFallback);
  }

  const defaultFallback: TestVariant = {
    ...generateLocalVariant(topic, label, variantIndex, style),
    textProvider: "local",
    textModel: "local-template"
  };
  return withImageMeta(defaultFallback);
}

export async function POST(request: Request): Promise<Response> {
  const payload = await request.json().catch(() => null);
  const parsedBody = requestSchema.safeParse(payload);

  if (!parsedBody.success) {
    return Response.json({ message: "请求参数不合法。" }, { status: 400 });
  }

  const { topic, count } = parsedBody.data;
  const requestedProvider = parsedBody.data.provider ?? getPreferredProviderFromEnv();
  const provider: LlmProviderSelection = requestedProvider;
  const forceLocal = provider === "local";
  const sampledStyles = sampleAssessmentStyles(count);
  const llmClient = new UnifiedLlmClient({
    preferredProvider: provider
  });
  const imageClient = new NanoBananaClient();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(
          toSseChunk({
            status: "progress",
            progress: 4,
            message: "已接收生成请求。"
          })
        );

        controller.enqueue(
          toSseChunk({
            status: "progress",
            progress: 6,
            message: forceLocal ? "当前使用本地生成器。" : `当前模型提供方：${provider}`
          })
        );

        const variants: TestVariant[] = [];
        for (let index = 0; index < count; index += 1) {
          const picked = sampledStyles[index];
          const label = picked?.label ?? String.fromCharCode(65 + index);
          const style = picked?.style;
          if (!style) {
            throw new Error("未找到可用测评风格");
          }

          controller.enqueue(
            toSseChunk({
              status: "progress",
              progress: 10 + Math.floor((index / count) * 70),
              message: `正在生成 ${label} 版（${style.name}）...`
            })
          );

          const variant = await createVariantWithProvider({
            client: llmClient,
            topic,
            label,
            style,
            variantIndex: index,
            forceLocal,
            imageClient
          });

          variants.push(variant);

          controller.enqueue(
            toSseChunk({
              status: "variant",
              index,
              total: count,
              variant
            })
          );

          controller.enqueue(
            toSseChunk({
              status: "progress",
              progress: 15 + Math.floor(((index + 1) / count) * 72),
              message: `${label} 版生成完成。`
            })
          );
        }

        const generatedTest: GeneratedTest = {
          id: crypto.randomUUID(),
          topic,
          createdAt: new Date().toISOString(),
          variants
        };

        controller.enqueue(
          toSseChunk({
            status: "progress",
            progress: 96,
            message: "正在整理最终结果..."
          })
        );

        controller.enqueue(
          toSseChunk({
            status: "done",
            test: generatedTest
          })
        );
      } catch (error) {
        controller.enqueue(
          toSseChunk({
            status: "error",
            message: error instanceof Error ? error.message : "生成失败，请稍后重试。"
          })
        );
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    }
  });
}
