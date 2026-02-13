import { z } from "zod";

import { attachGeneratedImage, NanoBananaClient } from "@/lib/image/nano-banana";
import { getPreferredProviderFromEnv, UnifiedLlmClient } from "@/lib/llm/client";
import {
  buildNanoBananaPrompt,
  buildSystemPrompt,
  buildUserPrompt,
  getAvailableStyleCount,
  generateLocalVariant,
  parseModelJson,
  repairVariantPayload,
  sampleAssessmentStylesByPolicy,
  type AssessmentStyle
} from "@/lib/prompts";
import { buildTopicAnalysis } from "@/lib/topic-deconstruction";
import type { GeneratedTest, GenerateSseEvent, LlmProviderSelection, TestVariant } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  topic: z.string().trim().min(2).max(120),
  count: z.number().int().min(1).max(5),
  enableImageVariants: z.boolean().optional(),
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

function applyTopicSafetyGuard(variant: TestVariant, topicAnalysis: GeneratedTest["topicAnalysis"]): TestVariant {
  if (!topicAnalysis || topicAnalysis.formConstraints.specialConsiderations.length === 0) {
    return variant;
  }

  const normalizePredictiveLanguage = (text: string): string => {
    return text
      .replace(/生存率/g, "应对倾向")
      .replace(/成功率/g, "准备度")
      .replace(/破产概率/g, "风险暴露倾向")
      .replace(/概率/g, "可能性");
  };

  const needsPredictiveGuard = topicAnalysis.formConstraints.specialConsiderations.some((item) =>
    item.includes("禁止真实概率预测")
  );
  const needsActionLadder = topicAnalysis.formConstraints.specialConsiderations.some((item) => item.includes("行动阶梯"));
  const disclaimer = topicAnalysis.formConstraints.specialConsiderations.join(" ");
  const rawDescription = needsPredictiveGuard ? normalizePredictiveLanguage(variant.description) : variant.description;
  const nextDescription = rawDescription.includes(disclaimer) ? rawDescription : `${rawDescription}（${disclaimer}）`;

  return {
    ...variant,
    headline: needsPredictiveGuard ? normalizePredictiveLanguage(variant.headline) : variant.headline,
    coverTitle: needsPredictiveGuard ? normalizePredictiveLanguage(variant.coverTitle) : variant.coverTitle,
    description: nextDescription,
    results: variant.results.map((item) => {
      const guardedDescription = needsPredictiveGuard ? normalizePredictiveLanguage(item.description) : item.description;
      const withDisclaimer = guardedDescription.includes(disclaimer)
        ? guardedDescription
        : `${guardedDescription}（${disclaimer}）`;
      const actionLadder = needsActionLadder
        ? "行动阶梯：1) 先做一次最小验证；2) 连续7天记录阻碍；3) 下周只优化一个关键变量。"
        : "";

      return {
        ...item,
        description: withDisclaimer,
        cta: actionLadder ? `${item.cta} ${actionLadder}`.trim() : item.cta
      };
    })
  };
}

async function createVariantWithProvider(params: {
  client: UnifiedLlmClient;
  topic: string;
  label: string;
  style: AssessmentStyle;
  variantIndex: number;
  forceLocal: boolean;
  imageClient: NanoBananaClient;
  topicAnalysis: GeneratedTest["topicAnalysis"];
}): Promise<TestVariant> {
  const { client, topic, label, style, variantIndex, forceLocal, imageClient, topicAnalysis } = params;
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
    return applyTopicSafetyGuard(await withImageMeta(withMeta), topicAnalysis);
  }

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await client.generate({
        systemPrompt: buildSystemPrompt(label, style, topicAnalysis ?? buildTopicAnalysis(topic)),
        userPrompt: buildUserPrompt(topic, label, style, topicAnalysis ?? buildTopicAnalysis(topic)),
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
      return applyTopicSafetyGuard(await withImageMeta(withMeta), topicAnalysis);
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
    return applyTopicSafetyGuard(await withImageMeta(localFallback), topicAnalysis);
  }

  const defaultFallback: TestVariant = {
    ...generateLocalVariant(topic, label, variantIndex, style),
    textProvider: "local",
    textModel: "local-template"
  };
  return applyTopicSafetyGuard(await withImageMeta(defaultFallback), topicAnalysis);
}

export async function POST(request: Request): Promise<Response> {
  const payload = await request.json().catch(() => null);
  const parsedBody = requestSchema.safeParse(payload);

  if (!parsedBody.success) {
    return Response.json({ message: "请求参数不合法。" }, { status: 400 });
  }

  const { topic, count } = parsedBody.data;
  const enableImageVariants = parsedBody.data.enableImageVariants ?? true;
  const requestedProvider = parsedBody.data.provider ?? getPreferredProviderFromEnv();
  const provider: LlmProviderSelection = requestedProvider;
  const forceLocal = provider === "local";
  const maxCount = getAvailableStyleCount(enableImageVariants);
  if (count > maxCount) {
    return Response.json({ message: `当前设置下最多只能生成 ${maxCount} 个变体。` }, { status: 400 });
  }
  const topicAnalysis = buildTopicAnalysis(topic);
  const sampledStyles = sampleAssessmentStylesByPolicy({
    count,
    recommendedStyles: topicAnalysis.formConstraints.recommendedStyles,
    allowedStyleKeys: topicAnalysis.formConstraints.allowedStyleKeys,
    allowImageStyles: enableImageVariants
  });
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
        controller.enqueue(
          toSseChunk({
            status: "progress",
            progress: 8,
            message: `主题解构完成：理论适配度 ${topicAnalysis.theoryFramework.confidence.level}`
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
            imageClient,
            topicAnalysis
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
          topicAnalysis,
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
