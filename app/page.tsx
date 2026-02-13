"use client";

import { FormEvent, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

import { buildMockGeneratedTest } from "@/lib/mock-test";
import { saveGeneratedTest, saveLatestTestId } from "@/lib/storage";
import { useTestStore } from "@/store/testStore";
import type { GenerateSseEvent, GeneratedTest, LlmProviderSelection } from "@/types";

const MIN_COUNT = 1;
const MAX_COUNT = 5;
const PROVIDERS: LlmProviderSelection[] = ["auto", "openai", "deepseek", "local"];
const PROVIDER_LABELS: Record<LlmProviderSelection, string> = {
  auto: "自动",
  openai: "OpenAI",
  deepseek: "DeepSeek",
  local: "本地"
};
type RunMode = "api" | "local";

export default function HomePage() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(3);
  const [provider, setProvider] = useState<LlmProviderSelection>("auto");
  const [runMode, setRunMode] = useState<RunMode>("api");
  const [errorText, setErrorText] = useState("");

  const {
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

  const canSubmit = useMemo(() => topic.trim().length >= 2 && !isGenerating, [topic, isGenerating]);

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
    setGenerating(true);
    setProgress(4, "请求已提交。");
    addStreamEvent("请求已提交。");

    try {
      if (runMode === "local") {
        setProgress(12, "使用本地模板生成中。");
        addStreamEvent("本地模板模式：不调用远程 API。");
        const test = buildMockGeneratedTest(topic.trim(), count);
        saveGeneratedTest(test);
        saveLatestTestId(test.id);
        setCurrentTest(test);
        setGenerating(false);
        setProgress(100, "本地模板生成完成，正在跳转预览...");
        router.push(`/preview/${test.id}`);
        return;
      }

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          topic: topic.trim(),
          count,
          provider
        })
      });

      if (!response.ok || !response.body) {
        throw new Error("生成请求失败。");
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
              setProgress(eventData.progress, eventData.message);
              addStreamEvent(eventData.message);
            }

            if (eventData.status === "variant") {
              addStreamEvent(`变体 ${eventData.variant.label} 已生成。`);
            }

            if (eventData.status === "done") {
              const test = eventData.test as GeneratedTest;
              saveGeneratedTest(test);
              saveLatestTestId(test.id);
              setCurrentTest(test);
              setGenerating(false);
              setProgress(100, "生成完成，正在跳转预览...");
              router.push(`/preview/${test.id}`);
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
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]"
      >
        <article className="card-surface p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">TestFlow V1</p>
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
              <span className="text-sm font-semibold text-slate-700">运行模式</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRunMode("api")}
                  className={[
                    "h-10 cursor-pointer rounded-xl border text-sm font-semibold transition-all",
                    runMode === "api"
                      ? "border-amber-300 bg-amber-50 text-amber-900"
                      : "border-slate-300 bg-white text-slate-700 hover:border-amber-200 hover:bg-amber-50/50"
                  ].join(" ")}
                >
                  API测试
                </button>
                <button
                  type="button"
                  onClick={() => setRunMode("local")}
                  className={[
                    "h-10 cursor-pointer rounded-xl border text-sm font-semibold transition-all",
                    runMode === "local"
                      ? "border-amber-300 bg-amber-50 text-amber-900"
                      : "border-slate-300 bg-white text-slate-700 hover:border-amber-200 hover:bg-amber-50/50"
                  ].join(" ")}
                >
                  本地测试
                </button>
              </div>
            </label>

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
              <span className="text-sm font-semibold text-slate-700">生成数量（1-5）</span>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: MAX_COUNT }, (_, i) => i + 1).map((value) => (
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
                max={MAX_COUNT}
                step={1}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full accent-amber-600"
              />
            </label>

            {runMode === "api" ? (
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">模型提供方</span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
              </label>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                本地测试模式：使用预置 5 种变体模板与固定图像，不调用文本/图像远程 API。
              </div>
            )}

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
              : streamEvents.slice(0, 6).map((item, index) => (
                  <div key={`${item}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {item}
                  </div>
                ))}
          </div>

          {!isGenerating && streamEvents.length > 0 ? (
            <button
              type="button"
              onClick={resetGeneration}
              className="mt-5 w-full rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-all hover:border-amber-300 hover:bg-amber-50"
            >
              清空日志
            </button>
          ) : null}
        </aside>
      </motion.section>
    </main>
  );
}
