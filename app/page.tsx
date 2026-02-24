"use client";

import { flushSync } from "react-dom";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

import DailyRecommendationCard from "@/components/daily-recommendation-card";
import DebugFloatingPanel from "@/components/debug-floating-panel";
import { saveGeneratedTest, saveLatestTestId } from "@/lib/client-storage";
import { buildMockGeneratedTest } from "@/lib/mock-test";
import { ASSESSMENT_STYLES, STYLE_LABELS, type StyleLabel } from "@/lib/prompts";
import { getClientDefaultRunMode, type RunMode } from "@/lib/runmode";
import { useTestStore } from "@/store/testStore";
import type { ApiResponse, DebugEntry, GenerateSseEvent, GeneratedTest, LlmProviderSelection } from "@/types";

const MIN_COUNT = 1;
const MAX_COUNT = 5;
const MAX_COUNT_WITHOUT_IMAGE = 4;
type VariantInputMode = "draw" | "select";
const PROVIDERS: LlmProviderSelection[] = ["auto", "modelgate", "openai", "deepseek", "local"];
const PROVIDER_LABELS: Record<LlmProviderSelection, string> = {
  auto: "自动",
  modelgate: "ModelGate",
  openai: "OpenAI",
  deepseek: "DeepSeek",
  local: "本地"
};

function resolveDefaultVariantInputMode(): VariantInputMode {
  return process.env.NEXT_PUBLIC_DEFAULT_VARIANT_INPUT_MODE === "draw" ? "draw" : "select";
}

export default function HomePage() {
  const showAuxControls = process.env.NEXT_PUBLIC_SHOW_AUX_CONTROLS !== "false";
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(3);
  const [variantInputMode, setVariantInputMode] = useState<VariantInputMode>(() => resolveDefaultVariantInputMode());
  const [selectedVariantLabel, setSelectedVariantLabel] = useState<StyleLabel>("B");
  const [provider, setProvider] = useState<LlmProviderSelection>("auto");
  const [runMode, setRunMode] = useState<RunMode>(() => getClientDefaultRunMode());
  const [enableImageVariants, setEnableImageVariants] = useState(false);
  const [qualityGateEnabled, setQualityGateEnabled] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [debugEntries, setDebugEntries] = useState<DebugEntry[]>([]);
  const maxCount = enableImageVariants ? MAX_COUNT : MAX_COUNT_WITHOUT_IMAGE;

  const {
    currentTest,
    isGenerating,
    progress,
    progressMessage,
    streamEvents,
    setGenerating,
    setProgress,
    addStreamEvent,
    setCurrentTest,
    resetGeneration
  } = useTestStore();

  const canSubmit = useMemo(
    () =>
      topic.trim().length >= 2 &&
      !isGenerating &&
      (variantInputMode === "draw"
        ? count >= MIN_COUNT && count <= maxCount
        : selectedVariantLabel !== "A" || enableImageVariants),
    [count, enableImageVariants, isGenerating, maxCount, selectedVariantLabel, topic, variantInputMode]
  );

  useEffect(() => {
    if (count > maxCount) {
      setCount(maxCount);
    }
  }, [count, maxCount]);

  useEffect(() => {
    if (!enableImageVariants && selectedVariantLabel === "A") {
      setSelectedVariantLabel("B");
      setErrorText("图像变体关闭后，已自动切换为 B（场景选择剧情型）。");
    }
  }, [enableImageVariants, selectedVariantLabel]);

  const parseEvent = (line: string): GenerateSseEvent | null => {
    if (!line.startsWith("data: ")) {
      return null;
    }
    const data = line.slice(6);
    try {
      return JSON.parse(data) as GenerateSseEvent;
    } catch {
      return null;
    }
  };

  const handleGenerate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    setErrorText("");
    setDebugEntries([]);
    setGenerating(true);
    setProgress(4, "请求已提交。");
    addStreamEvent("请求已提交。");

    try {
      if (runMode === "local") {
        setProgress(12, "使用本地模板生成中。");
        addStreamEvent("本地模板模式：不调用远程 API。");
        const test = buildMockGeneratedTest(topic.trim(), variantInputMode === "draw" ? count : 1, {
          enableImageVariants,
          selectedVariantLabel: variantInputMode === "select" ? selectedVariantLabel : undefined
        });
        setDebugEntries(test.debugTrace ?? []);
        saveGeneratedTest(test);
        saveLatestTestId(test.id);
        setCurrentTest(test);
        setGenerating(false);
        setProgress(100, "本地模板生成完成。");
        return;
      }

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          topic: topic.trim(),
          ...(variantInputMode === "draw" ? { count } : { selectedVariantLabel }),
          variantInputMode,
          enableImageVariants,
          strictRemote: true,
          qualityGateEnabled,
          provider,
          stream: true
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as ApiResponse<never> | null;
        throw new Error(payload?.error?.message ?? "生成请求失败。");
      }
      if (!response.body) {
        throw new Error("生成请求失败：未收到流式响应。");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";

        for (const chunk of chunks) {
          const lines = chunk.split("\n");
          for (const line of lines) {
            const eventData = parseEvent(line.trim());
            if (!eventData) {
              continue;
            }

            if (eventData.status === "progress") {
              flushSync(() => {
                setProgress(eventData.progress, eventData.message);
                addStreamEvent(eventData.message);
              });
            }

            if (eventData.status === "variant") {
              flushSync(() => {
                addStreamEvent(`变体 ${eventData.variant.label} 已生成。`);
              });
            }

            if (eventData.status === "debug") {
              flushSync(() => {
                setDebugEntries((current) => [...current, eventData.entry].slice(-200));
              });
            }

            if (eventData.status === "done") {
              const test = eventData.test as GeneratedTest;
              saveGeneratedTest(test);
              saveLatestTestId(test.id);
              flushSync(() => {
                setCurrentTest(test);
                setGenerating(false);
                setProgress(100, "生成完成。");
              });
              return;
            }

            if (eventData.status === "error") {
              throw new Error(eventData.message);
            }
          }
        }
      }

      setGenerating(false);
    } catch (error) {
      setGenerating(false);
      setProgress(0, "生成已中断。");
      const message = error instanceof Error ? error.message : "生成失败。";
      setErrorText(message);
      addStreamEvent(`失败：${message}`);
    }
  };

  return (
    <main className="page-wrap">
      <DailyRecommendationCard />
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]"
      >
        <article className="card-surface relative p-6 md:p-8">
          {showAuxControls ? (
            <div className="absolute right-6 !top-3 flex items-center gap-2 md:right-8 md:top-8">
              <div className="inline-flex h-8 overflow-hidden rounded-full border border-slate-300 bg-white">
                <button
                  type="button"
                  onClick={() => setRunMode("api")}
                  className={[
                    "h-8 px-3 text-xs font-semibold transition-all",
                    runMode === "api" ? "bg-slate-900 text-white" : "bg-transparent text-slate-600 hover:bg-slate-50"
                  ].join(" ")}
                  title="API 测试：调用 /api/generate 与远程模型"
                >
                  API
                </button>
                <button
                  type="button"
                  onClick={() => setRunMode("local")}
                  className={[
                    "h-8 px-3 text-xs font-semibold transition-all",
                    runMode === "local" ? "bg-slate-900 text-white" : "bg-transparent text-slate-600 hover:bg-slate-50"
                  ].join(" ")}
                  title="本地测试：不调用远程 API"
                >
                  本地
                </button>
              </div>
              <button
                type="button"
                onClick={() => setEnableImageVariants((value) => !value)}
                className={[
                  "inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition-all",
                  enableImageVariants
                    ? "border-amber-300 bg-amber-50 text-amber-900"
                    : "border-slate-300 bg-white text-slate-600"
                ].join(" ")}
                title="图像变体开启后，图像端会按后端策略自动选择 ModelGate 或 Nano Banana"
              >
                <span>图像变体</span>
                <span>{enableImageVariants ? "开" : "关"}</span>
              </button>
              <button
                type="button"
                onClick={() => setQualityGateEnabled((value) => !value)}
                className={[
                  "inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition-all",
                  qualityGateEnabled
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                    : "border-slate-300 bg-white text-slate-600"
                ].join(" ")}
                title="关闭后跳过主题一致性与去相似质量门控"
              >
                <span>质量门控</span>
                <span>{qualityGateEnabled ? "开" : "关"}</span>
              </button>
            </div>
          ) : null}
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">TestFlow V9</p>
          <h1 className="mt-2 text-4xl font-semibold leading-tight text-slate-900 md:text-5xl">
            输入主题，快速生成
            <br />
            可传播心理测试素材
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            系统会以 SSE 流式返回 A/B/C 变体，支持独立 HTML 导出、1080x1440 截图导出与完整 ZIP 资源包下载。
          </p>

          <form onSubmit={handleGenerate} className="mt-8 grid gap-6">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">测试主题</span>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="例如：拖延、自律、亲密关系、职场压力"
                className="h-12 rounded-2xl border border-slate-300 bg-white px-4 text-base text-slate-800 shadow-sm outline-none transition-all focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">变体输入模式</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setVariantInputMode("select")}
                  className={[
                    "h-11 cursor-pointer rounded-xl border text-sm font-semibold transition-all",
                    variantInputMode === "select"
                      ? "border-amber-300 bg-amber-50 text-amber-900"
                      : "border-slate-300 bg-white text-slate-700 hover:border-amber-200 hover:bg-amber-50/50"
                  ].join(" ")}
                >
                  自主选择
                </button>
                <button
                  type="button"
                  onClick={() => setVariantInputMode("draw")}
                  className={[
                    "h-11 cursor-pointer rounded-xl border text-sm font-semibold transition-all",
                    variantInputMode === "draw"
                      ? "border-amber-300 bg-amber-50 text-amber-900"
                      : "border-slate-300 bg-white text-slate-700 hover:border-amber-200 hover:bg-amber-50/50"
                  ].join(" ")}
                >
                  抽卡随机
                </button>
              </div>
            </label>

            {variantInputMode === "draw" ? (
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  生成数量（{MIN_COUNT}-{maxCount}）
                </span>
                <div className={`grid gap-2 ${maxCount === 5 ? "grid-cols-5" : "grid-cols-4"}`}>
                  {Array.from({ length: maxCount }, (_, i) => i + 1).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setCount(value)}
                      className={[
                        "h-11 cursor-pointer rounded-xl border text-sm font-semibold transition-all",
                        count === value
                          ? "border-amber-300 bg-amber-50 text-amber-900"
                          : "border-slate-300 bg-white text-slate-700 hover:border-amber-200 hover:bg-amber-50/50"
                      ].join(" ")}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <input
                  type="range"
                  min={MIN_COUNT}
                  max={maxCount}
                  step={1}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full accent-amber-600"
                />
                <p className="text-xs text-slate-500">系统将随机抽取 {count} 种测评风格。</p>
              </label>
            ) : (
              <fieldset className="grid gap-2">
                <legend className="text-sm font-semibold text-slate-700">变体类型单选</legend>
                <p className="text-xs text-slate-500">将生成 1 个变体，请选择一种测评风格。</p>
                <div className="grid gap-2">
                  {STYLE_LABELS.map((label) => {
                    const style = ASSESSMENT_STYLES[label];
                    const disabled = !enableImageVariants && style.requiresImage;
                    return (
                      <label
                        key={label}
                        className={[
                          "flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2 text-sm transition-all",
                          selectedVariantLabel === label
                            ? "border-amber-300 bg-amber-50 text-amber-900"
                            : "border-slate-300 bg-white text-slate-700 hover:border-amber-200 hover:bg-amber-50/50",
                          disabled ? "cursor-not-allowed opacity-50" : ""
                        ].join(" ")}
                      >
                        <span className="font-semibold">
                          {label}. {style.name}
                        </span>
                        <span className="text-xs text-slate-500">{disabled ? "需开启图像变体" : "可选"}</span>
                        <input
                          type="radio"
                          name="variant-style"
                          value={label}
                          checked={selectedVariantLabel === label}
                          onChange={() => setSelectedVariantLabel(label)}
                          disabled={disabled}
                          className="sr-only"
                        />
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {runMode === "api" && showAuxControls ? (
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">文本模型提供方</span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {PROVIDERS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setProvider(value)}
                      className={[
                        "h-10 cursor-pointer rounded-xl border text-sm font-semibold uppercase transition-all",
                        provider === value
                          ? "border-amber-300 bg-amber-50 text-amber-900"
                          : "border-slate-300 bg-white text-slate-700 hover:border-amber-200 hover:bg-amber-50/50"
                      ].join(" ")}
                    >
                      {PROVIDER_LABELS[value]}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500">
                  图像模型由后端自动协同：若已配置 ModelGate 图像环境变量则优先走 ModelGate，否则回退 Nano Banana。
                </p>
              </label>
            ) : runMode !== "api" && showAuxControls ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                本地测试模式：使用预置模板，不调用文本/图像远程 API。
                {!enableImageVariants ? " 当前已关闭图像变体。" : ""}
              </div>
            ) : null}

            <button type="submit" className="btn-primary disabled:cursor-not-allowed disabled:opacity-60" disabled={!canSubmit}>
              {isGenerating ? "测试中..." : runMode === "api" ? "开始测试" : "开始本地测试"}
            </button>

            {errorText ? <p className="text-sm font-medium text-rose-600">{errorText}</p> : null}
          </form>
        </article>

        <aside className="card-surface p-6 md:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">实时进度</p>
          <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-200">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: "easeOut", duration: 0.25 }}
            />
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-700">
            {progress}% · {progressMessage}
          </p>

          <div className="mt-5 grid gap-2">
            {isGenerating
              ? Array.from({ length: 4 }).map((_, index) => (
                <div key={`skeleton-${index}`} className="h-10 animate-pulse rounded-xl bg-slate-200/70" />
              ))
              : [...streamEvents].reverse().slice(-8).map((item, index) => (
                <div key={`${item}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {item}
                </div>
              ))}
          </div>

          {!isGenerating && streamEvents.length > 0 ? (
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={resetGeneration}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-all hover:border-amber-300 hover:bg-amber-50"
              >
                清空日志
              </button>
              {currentTest ? (
                <button
                  type="button"
                  onClick={() => router.push(`/preview/${currentTest.id}`)}
                  className="w-full rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 transition-all hover:bg-amber-100"
                >
                  前往预览
                </button>
              ) : null}
            </div>
          ) : null}
        </aside>
      </motion.section>
      {showAuxControls ? <DebugFloatingPanel entries={debugEntries} title="首页调试面板" /> : null}
    </main>
  );
}
