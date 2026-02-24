import { createImageClient } from "@/lib/image/client";
import { attachGeneratedImage } from "@/lib/image/nano-banana";
import type { ImageGenerateClient } from "@/lib/image/types";
import { getPreferredProviderFromEnv, UnifiedLlmClient } from "@/lib/llm/client";
import { logger } from "@/lib/logger";
import {
  ASSESSMENT_STYLES,
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
import { shouldForceLocalByRunMode } from "@/lib/runmode";
import { buildTopicAnalysis } from "@/lib/topic-deconstruction";
import type {
  DebugEntry,
  GeneratedTest,
  GenerateParams,
  GenerateSseEvent,
  LlmProviderSelection,
  TestVariant,
  VariantGenerationFailure
} from "@/types";

export class GenerateInputError extends Error {}

const encoder = new TextEncoder();

function toSseChunk(event: GenerateSseEvent): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function createDebugEntry(input: Omit<DebugEntry, "id" | "at">): DebugEntry {
  return {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    ...input
  };
}

function tokenize(text: string): string[] {
  return Array.from(
    new Set((text.toLowerCase().match(/[\u4e00-\u9fa5a-z0-9]{2,}/g) ?? []).filter((item) => item.length >= 2))
  );
}

function jaccardSimilarity(left: string, right: string): number {
  const leftSet = new Set(tokenize(left));
  const rightSet = new Set(tokenize(right));
  if (leftSet.size === 0 || rightSet.size === 0) {
    return 0;
  }
  let intersection = 0;
  leftSet.forEach((item) => {
    if (rightSet.has(item)) {
      intersection += 1;
    }
  });
  const union = leftSet.size + rightSet.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function includesTopicAnchor(text: string, topic: string): boolean {
  if (text.includes(topic)) {
    return true;
  }
  const topicTokens = tokenize(topic);
  if (topicTokens.length === 0) {
    return false;
  }
  return topicTokens.some((token) => text.includes(token));
}

function validateVariantQuality(params: {
  variant: TestVariant;
  topic: string;
  existingQuestionTitles: string[];
}): string[] {
  const { variant, topic, existingQuestionTitles } = params;
  const errors: string[] = [];
  const titles = variant.questions.map((item) => item.title.trim());

  variant.questions.forEach((question, questionIndex) => {
    const combined = `${question.title} ${question.subtitle ?? ""} ${question.options.map((option) => option.text).join(" ")}`;
    if (!includesTopicAnchor(combined, topic)) {
      errors.push(`第${questionIndex + 1}题与主题关联弱`);
    }

    for (let optionIndex = 0; optionIndex < question.options.length; optionIndex += 1) {
      for (let next = optionIndex + 1; next < question.options.length; next += 1) {
        const similarity = jaccardSimilarity(question.options[optionIndex].text, question.options[next].text);
        if (similarity > 0.8) {
          errors.push(`第${questionIndex + 1}题选项区分度不足`);
          break;
        }
      }
    }
  });

  for (let index = 0; index < titles.length; index += 1) {
    for (let next = index + 1; next < titles.length; next += 1) {
      if (jaccardSimilarity(titles[index], titles[next]) > 0.72) {
        errors.push("同一变体题目过于相似");
      }
    }
  }

  titles.forEach((title) => {
    if (existingQuestionTitles.some((existing) => jaccardSimilarity(existing, title) > 0.72)) {
      errors.push("与已有变体题目过于相似");
    }
  });

  for (let index = 0; index < variant.results.length; index += 1) {
    for (let next = index + 1; next < variant.results.length; next += 1) {
      if (jaccardSimilarity(variant.results[index].description, variant.results[next].description) > 0.75) {
        errors.push("结果卡描述过于相似");
      }
    }
  }

  return Array.from(new Set(errors));
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
  imageClient: ImageGenerateClient | null;
  topicAnalysis: GeneratedTest["topicAnalysis"];
  existingQuestionTitles: string[];
  strictRemote: boolean;
  qualityGateEnabled: boolean;
  onDebug: (entry: DebugEntry) => void;
  enableImageVariants: boolean;
  allowRemoteImage: boolean;
}): Promise<TestVariant> {
  const {
    client,
    topic,
    label,
    style,
    variantIndex,
    forceLocal,
    imageClient,
    topicAnalysis,
    existingQuestionTitles,
    strictRemote,
    qualityGateEnabled,
    enableImageVariants,
    allowRemoteImage
  } = params;
  const imageProvider = imageClient?.provider ?? "none";
  const imageModel = imageClient?.model ?? "none";
  const { onDebug } = params;

  const withImageMeta = async (base: TestVariant): Promise<TestVariant> => {
    if (!enableImageVariants || !style.requiresImage || !allowRemoteImage) {
      return {
        ...base,
        imagePrompt: undefined,
        imageAssets: undefined,
        imageProvider: undefined,
        imageModel: undefined
      };
    }
    const imagePrompt = base.imagePrompt ?? buildNanoBananaPrompt(topic, style);
    if (!imagePrompt || !imageClient) {
      onDebug(
        createDebugEntry({
          source: "image",
          stage: "image-generate-skipped",
          provider: imageProvider,
          model: imageModel,
          variantLabel: label,
          message: "图像生成已跳过：未配置可用图像提供方",
          payload: imagePrompt ?? ""
        })
      );
      return base;
    }
    onDebug(
      createDebugEntry({
        source: "image",
        stage: "image-generate-start",
        provider: imageClient.provider,
        model: imageModel,
        variantLabel: label,
        message: "开始请求图像生成",
        payload: imagePrompt
      })
    );
    try {
      const imageUrl = await imageClient.generate({
        prompt: imagePrompt,
        aspectRatio: base.imageAspectRatio,
        timeoutMs: 60_000
      });
      onDebug(
        createDebugEntry({
          source: "image",
          stage: "image-generate-success",
          provider: imageClient.provider,
          model: imageModel,
          variantLabel: label,
          message: imageUrl ? "图像生成成功" : "图像接口无返回URL",
          payload: imageUrl ?? ""
        })
      );
      const withImage = attachGeneratedImage(base, imageUrl, imagePrompt, imageClient.provider);
      if (!imageUrl) {
        return withImage;
      }
      return {
        ...withImage,
        imageProvider: imageClient.provider,
        imageModel
      };
    } catch {
      onDebug(
        createDebugEntry({
          source: "image",
          stage: "image-generate-error",
          provider: imageClient.provider,
          model: imageModel,
          variantLabel: label,
          message: "图像生成失败，继续文本结果",
          payload: imagePrompt
        })
      );
      return base;
    }
  };

  if (forceLocal || !client.hasRemoteProvider()) {
    if (strictRemote) {
      throw new Error("strictRemote 已开启：远程模型不可用，已阻止本地兜底。");
    }
    const localVariant = generateLocalVariant(topic, label, variantIndex, style);
    const withMeta: TestVariant = {
      ...localVariant,
      generationSource: "local-mode",
      textProvider: "local",
      textModel: "local-template",
      rawModelOutput: "[local-mode]"
    };
    onDebug(
      createDebugEntry({
        source: "fallback",
        stage: "local-mode",
        provider: "local",
        model: "local-template",
        variantLabel: label,
        message: "使用本地模板生成",
        payload: withMeta.rawModelOutput
      })
    );
    return applyTopicSafetyGuard(await withImageMeta(withMeta), topicAnalysis);
  }

  let lastError: unknown = null;
  let feedback = "";
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      onDebug(
        createDebugEntry({
          source: "llm",
          stage: "llm-request",
          provider: client.hasRemoteProvider() ? "remote-llm" : "none",
          variantLabel: label,
          message: `开始第 ${attempt} 次文本生成`,
          payload: feedback || "无重写反馈"
        })
      );
      const response = await client.generate({
        systemPrompt: buildSystemPrompt(label, style, topicAnalysis ?? buildTopicAnalysis(topic)),
        userPrompt: buildUserPrompt(topic, label, style, topicAnalysis ?? buildTopicAnalysis(topic), {
          avoidQuestionTitles: existingQuestionTitles,
          qualityFeedback: feedback
        }),
        timeoutMs: 60_000
      });
      onDebug(
        createDebugEntry({
          source: "llm",
          stage: "llm-response",
          provider: response.provider,
          model: response.model,
          variantLabel: label,
          message: `收到模型返回（第 ${attempt} 次）`,
          payload: response.content
        })
      );
      const parsedPayload = parseModelJson(response.content);
      const repaired = repairVariantPayload(parsedPayload, {
        topic,
        label,
        variantIndex,
        style,
        fallbackMode: "minimal"
      });
      if (qualityGateEnabled) {
        const qualityErrors = validateVariantQuality({
          variant: repaired,
          topic,
          existingQuestionTitles
        });
        if (qualityErrors.length > 0) {
          feedback = qualityErrors.join("；");
          onDebug(
            createDebugEntry({
              source: "llm",
              stage: "quality-rewrite",
              provider: response.provider,
              model: response.model,
              variantLabel: label,
              message: "质量门控未通过，触发重写",
              payload: feedback
            })
          );
          throw new Error(`质量校验失败：${feedback}`);
        }
      } else {
        onDebug(
          createDebugEntry({
            source: "llm",
            stage: "quality-gate-skipped",
            provider: response.provider,
            model: response.model,
            variantLabel: label,
            message: "质量门控已关闭，跳过校验",
            payload: ""
          })
        );
      }
      const withMeta: TestVariant = {
        ...repaired,
        generationSource: attempt === 1 ? "remote" : "remote-rewrite",
        textProvider: response.provider,
        textModel: response.model,
        rawModelOutput: response.content
      };
      return applyTopicSafetyGuard(await withImageMeta(withMeta), topicAnalysis);
    } catch (error) {
      lastError = error;
      onDebug(
        createDebugEntry({
          source: "llm",
          stage: "llm-error",
          provider: client.hasRemoteProvider() ? "remote-llm" : "none",
          variantLabel: label,
          message: `第 ${attempt} 次生成失败`,
          payload: error instanceof Error ? error.message : "unknown-error"
        })
      );
      if (attempt < 3) {
        await delay(attempt * 500);
      }
    }
  }

  if (lastError) {
    if (strictRemote) {
      throw lastError instanceof Error
        ? new Error(`strictRemote 已开启：远程生成失败（${lastError.message}）`)
        : new Error("strictRemote 已开启：远程生成失败。");
    }
    const localFallback: TestVariant = {
      ...generateLocalVariant(topic, label, variantIndex, style),
      generationSource: "local-fallback",
      textProvider: "local",
      textModel: "local-template",
      rawModelOutput: `[local-fallback] ${lastError instanceof Error ? lastError.message : "unknown"}`
    };
    onDebug(
      createDebugEntry({
        source: "fallback",
        stage: "local-fallback",
        provider: "local",
        model: "local-template",
        variantLabel: label,
        message: "远程失败后回退本地模板",
        payload: localFallback.rawModelOutput
      })
    );
    return applyTopicSafetyGuard(await withImageMeta(localFallback), topicAnalysis);
  }

  const defaultFallback: TestVariant = {
    ...generateLocalVariant(topic, label, variantIndex, style),
    generationSource: "local-fallback",
    textProvider: "local",
    textModel: "local-template",
    rawModelOutput: "[local-fallback] no-remote-result"
  };
  onDebug(
    createDebugEntry({
      source: "fallback",
      stage: "local-fallback-default",
      provider: "local",
      model: "local-template",
      variantLabel: label,
      message: "触发默认本地回退",
      payload: defaultFallback.rawModelOutput
    })
  );
  return applyTopicSafetyGuard(await withImageMeta(defaultFallback), topicAnalysis);
}

interface ResolvedGenerateContext {
  topic: string;
  topicAnalysis: ReturnType<typeof buildTopicAnalysis>;
  stylesToGenerate: Array<{ label: string; style: AssessmentStyle }>;
  totalVariants: number;
  llmClient: UnifiedLlmClient;
  imageClient: ImageGenerateClient | null;
  forceLocal: boolean;
  provider: LlmProviderSelection;
  enableImageVariants: boolean;
  strictRemote: boolean;
  qualityGateEnabled: boolean;
}

function resolveGenerateInput(input: GenerateParams): ResolvedGenerateContext {
  const { topic } = input;
  if (!topic || topic.trim().length < 2) {
    throw new GenerateInputError("请求参数不合法。");
  }
  const count = input.count ?? 1;
  const selectedVariantLabel = input.selectedVariantLabel;
  const variantInputMode = input.variantInputMode ?? (selectedVariantLabel ? "select" : "draw");
  const enableImageVariants = input.enableImageVariants ?? true;
  const strictRemote = input.strictRemote ?? false;
  const qualityGateEnabled = input.qualityGateEnabled ?? true;
  if (variantInputMode === "select" && !selectedVariantLabel) {
    throw new GenerateInputError("选择模式下必须提供 selectedVariantLabel。");
  }
  if (selectedVariantLabel === "A" && !enableImageVariants) {
    throw new GenerateInputError("未开启图像变体时不能选择第一眼图像投射型（A）。");
  }
  if (!selectedVariantLabel && input.count === undefined) {
    throw new GenerateInputError("抽卡模式下必须提供 count。");
  }
  const requestedProvider = input.provider ?? getPreferredProviderFromEnv();
  const runModeForcesLocal = shouldForceLocalByRunMode();
  const provider: LlmProviderSelection = runModeForcesLocal ? "local" : requestedProvider;
  const forceLocal = runModeForcesLocal || provider === "local";
  if (strictRemote && forceLocal) {
    throw new GenerateInputError("strictRemote 开启时不允许使用 local provider。");
  }
  const topicAnalysis = buildTopicAnalysis(topic);
  const maxCount = getAvailableStyleCount(enableImageVariants);
  if (!selectedVariantLabel && count > maxCount) {
    throw new GenerateInputError(`当前设置下最多只能生成 ${maxCount} 个变体。`);
  }
  const stylesToGenerate = selectedVariantLabel
    ? [{ label: selectedVariantLabel, style: ASSESSMENT_STYLES[selectedVariantLabel] }]
    : sampleAssessmentStylesByPolicy({
        count,
        recommendedStyles: topicAnalysis.formConstraints.recommendedStyles,
        allowedStyleKeys: topicAnalysis.formConstraints.allowedStyleKeys,
        allowImageStyles: enableImageVariants
      });
  const totalVariants = stylesToGenerate.length;
  if (totalVariants === 0) {
    throw new GenerateInputError("未找到可用测评风格。");
  }
  const llmClient = new UnifiedLlmClient({ preferredProvider: provider });
  const imageClient = createImageClient(provider);
  return {
    topic,
    topicAnalysis,
    stylesToGenerate,
    totalVariants,
    llmClient,
    imageClient,
    forceLocal,
    provider,
    enableImageVariants,
    strictRemote,
    qualityGateEnabled
  };
}

/** 非流式生成：供 API / Agent 调用，返回完整 GeneratedTest，响应格式为统一 JSON。 */
export async function generateTestContent(input: GenerateParams): Promise<GeneratedTest> {
  const ctx = resolveGenerateInput(input);
  const {
    topic,
    topicAnalysis,
    stylesToGenerate,
    totalVariants,
    llmClient,
    imageClient,
    forceLocal,
    enableImageVariants,
    strictRemote,
    qualityGateEnabled
  } = ctx;
  logger.info("generate.json.start", {
    topic,
    totalVariants,
    provider: ctx.provider,
    forceLocal,
    enableImageVariants
  });
  const debugTrace: DebugEntry[] = [];
  const pushDebug = (entry: DebugEntry) => {
    debugTrace.push(entry);
  };
  const variants: TestVariant[] = [];
  const failures: VariantGenerationFailure[] = [];
  const existingQuestionTitles: string[] = [];

  for (let index = 0; index < totalVariants; index += 1) {
    const picked = stylesToGenerate[index];
    const label = picked?.label ?? String.fromCharCode(65 + index);
    const style = picked?.style;
    const styleName = style?.name;
    try {
      if (!style) {
        throw new Error("未找到可用测评风格");
      }
      const variant = await createVariantWithProvider({
        client: llmClient,
        topic,
        label,
        style,
        variantIndex: index,
        forceLocal,
        imageClient,
        topicAnalysis,
        existingQuestionTitles,
        strictRemote,
        qualityGateEnabled,
        onDebug: pushDebug,
        enableImageVariants,
        allowRemoteImage: !forceLocal
      });
      variants.push(variant);
      variant.questions.forEach((item) => {
        existingQuestionTitles.push(item.title);
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      failures.push({
        label,
        styleName,
        error: errorMessage,
        attemptAt: new Date().toISOString()
      });
    }
  }

  const successCount = variants.length;
  const failureCount = failures.length;
  if (successCount === 0) {
    const reasonSummary = failures
      .slice(0, 2)
      .map((item) => `${item.label}${item.styleName ? `（${item.styleName}）` : ""}：${item.error}`)
      .join("；");
    throw new Error(
      reasonSummary
        ? `所有变体生成失败：${reasonSummary}。请检查配置或稍后重试。`
        : "所有变体生成失败，请检查配置或稍后重试。"
    );
  }

  const generatedTest: GeneratedTest = {
    id: crypto.randomUUID(),
    topic,
    createdAt: new Date().toISOString(),
    topicAnalysis,
    debugTrace,
    variants,
    successCount,
    failureCount,
    failures: failureCount > 0 ? failures : undefined
  };
  logger.info("generate.json.done", { topic, totalVariants, successCount, failureCount });
  return generatedTest;
}

export function createGenerateStreamResponse(input: GenerateParams): Response {
  const ctx = resolveGenerateInput(input);
  const {
    topic,
    topicAnalysis,
    stylesToGenerate,
    totalVariants,
    llmClient,
    imageClient,
    forceLocal,
    provider,
    enableImageVariants,
    strictRemote,
    qualityGateEnabled
  } = ctx;
  logger.info("generate.stream.start", {
    topic,
    totalVariants,
    provider,
    forceLocal,
    enableImageVariants,
    strictRemote,
    qualityGateEnabled
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const debugTrace: DebugEntry[] = [];
        const pushDebug = (entry: DebugEntry) => {
          debugTrace.push(entry);
          controller.enqueue(
            toSseChunk({
              status: "debug",
              entry
            })
          );
        };
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
            message: `主题解构完成：理论适配度 ${topicAnalysis.theoryFramework.confidence.level}，即将生成 ${totalVariants} 个变体。`
          })
        );

        const variants: TestVariant[] = [];
        const failures: VariantGenerationFailure[] = [];
        const existingQuestionTitles: string[] = [];
        for (let index = 0; index < totalVariants; index += 1) {
          const picked = stylesToGenerate[index];
          const label = picked?.label ?? String.fromCharCode(65 + index);
          const style = picked?.style;
          const styleName = style?.name;

          controller.enqueue(
            toSseChunk({
              status: "progress",
              progress: 10 + Math.floor((index / totalVariants) * 70),
              message: `正在生成 ${label} 版${styleName ? `（${styleName}）` : ""}...`
            })
          );

          try {
            if (!style) {
              throw new Error("未找到可用测评风格");
            }

            const variant = await createVariantWithProvider({
              client: llmClient,
              topic,
              label,
              style,
              variantIndex: index,
              forceLocal,
              imageClient,
              topicAnalysis,
              existingQuestionTitles,
              strictRemote,
              qualityGateEnabled,
              onDebug: pushDebug,
              enableImageVariants,
              allowRemoteImage: !forceLocal
            });

            variants.push(variant);
            variant.questions.forEach((item) => {
              existingQuestionTitles.push(item.title);
            });

            controller.enqueue(
              toSseChunk({
                status: "variant",
                index,
                total: totalVariants,
                variant
              })
            );

            controller.enqueue(
              toSseChunk({
                status: "progress",
                progress: 15 + Math.floor(((index + 1) / totalVariants) * 72),
                message: `${label} 版生成完成。`
              })
            );
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "未知错误";
            failures.push({
              label,
              styleName,
              error: errorMessage,
              attemptAt: new Date().toISOString()
            });

            controller.enqueue(
              toSseChunk({
                status: "progress",
                progress: 15 + Math.floor(((index + 1) / totalVariants) * 72),
                message: `变体 ${label}${styleName ? `（${styleName}）` : ""} 生成失败：${errorMessage}，继续生成其他变体...`
              })
            );
          }
        }

        const successCount = variants.length;
        const failureCount = failures.length;
        controller.enqueue(
          toSseChunk({
            status: "progress",
            progress: 94,
            message: `生成完成：成功 ${successCount} 个，失败 ${failureCount} 个。`
          })
        );

        if (successCount === 0) {
          const reasonSummary = failures
            .slice(0, 2)
            .map((item) => `${item.label}${item.styleName ? `（${item.styleName}）` : ""}：${item.error}`)
            .join("；");
          throw new Error(
            reasonSummary
              ? `所有变体生成失败：${reasonSummary}。请检查配置或稍后重试。`
              : "所有变体生成失败，请检查配置或稍后重试。"
          );
        }

        const generatedTest: GeneratedTest = {
          id: crypto.randomUUID(),
          topic,
          createdAt: new Date().toISOString(),
          topicAnalysis,
          debugTrace,
          variants,
          successCount,
          failureCount,
          failures: failureCount > 0 ? failures : undefined
        };
        logger.info("generate.stream.done", {
          topic,
          totalVariants,
          successCount,
          failureCount
        });

        controller.enqueue(
          toSseChunk({
            status: "progress",
            progress: 96,
            message: "已生成最终结果"
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
        logger.error("generate.stream.fail", {
          topic,
          totalVariants,
          error: error instanceof Error ? error.message : "unknown"
        });
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
