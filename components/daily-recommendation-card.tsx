import { useEffect, useMemo, useState } from "react";

import DailyRecommendationDetail from "@/components/daily-recommendation-detail";
import type { DailyContent } from "@/types";

interface DailyContentResponse {
  date: string;
  content: DailyContent | null;
}

function resolveToday(): string {
  return new Date().toISOString().split("T")[0];
}

export default function DailyRecommendationCard() {
  const today = useMemo(() => resolveToday(), []);
  const [content, setContent] = useState<DailyContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const fetchTodayContent = async (): Promise<DailyContent | null> => {
    const response = await fetch("/api/daily/content");
    if (!response.ok) {
      throw new Error("加载今日推荐失败。");
    }
    const data = (await response.json()) as DailyContentResponse;
    return data.content;
  };

  const generateTodayContent = async (force = false): Promise<DailyContent> => {
    const response = await fetch("/api/daily/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ date: today, force })
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.message ?? "生成失败，请稍后重试。");
    }
    return (await response.json()) as DailyContent;
  };

  const ensureContent = async (force = false) => {
    setIsLoading(true);
    setErrorText(null);
    try {
      const existing = await fetchTodayContent();
      if (existing && !force) {
        setContent(existing);
        return;
      }
      setIsGenerating(true);
      const generated = await generateTodayContent(force);
      setContent(generated);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "生成失败，请稍后重试。");
    } finally {
      setIsGenerating(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void ensureContent();
  }, []);

  const handleClick = () => {
    if (errorText || !content) {
      void ensureContent();
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="fixed bottom-4 left-1/2 z-[60] w-[min(90vw,300px)] -translate-x-1/2 cursor-pointer rounded-3xl border border-slate-200 bg-white/95 p-3 text-left shadow-lg backdrop-blur transition-all hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-xl sm:bottom-auto sm:left-4 sm:top-20 sm:w-[210px] sm:translate-x-0 lg:top-24"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">今日推荐</p>
        <div className="mt-2 min-h-[38px]">
          {isLoading || isGenerating ? (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
              正在生成推荐...
            </div>
          ) : errorText ? (
            <p className="text-xs font-semibold text-rose-600">{errorText}</p>
          ) : (
            <p className="text-sm font-semibold text-slate-900">{content?.shortTheme ?? "暂无推荐"}</p>
          )}
        </div>
        <p className="mt-2 text-[11px] text-slate-500">{errorText ? "点击重试" : "点击查看"}</p>
      </button>

      <DailyRecommendationDetail
        open={open}
        content={content}
        onClose={() => setOpen(false)}
        onRegenerate={() => void ensureContent(true)}
        isRegenerating={isGenerating}
      />
    </>
  );
}
