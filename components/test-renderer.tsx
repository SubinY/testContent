"use client";

import type { TestVariant } from "@/types";

interface TestRendererProps {
  variant: TestVariant;
}

function getInteractionHint(variant: TestVariant): string {
  if (variant.styleKey === "image_projection") {
    return "图像投射交互：先看图，再按第一直觉选择。";
  }
  if (variant.styleKey === "story_scene") {
    return "剧情分支交互：按场景阶段逐步推进。";
  }
  if (variant.styleKey === "attachment_index") {
    return "量表交互：按频率/倾向选择最接近的一项。";
  }
  if (variant.styleKey === "life_potential") {
    return "潜力交互：围绕价值观和行动偏好做选择。";
  }
  if (variant.styleKey === "mental_health_check") {
    return "自评交互：按最近状态频次作答。";
  }
  return "标准交互：逐题选择后生成结果。";
}

export default function TestRenderer(props: TestRendererProps) {
  const { variant } = props;
  const imageUrl = variant.imageAssets?.[0]?.url;
  const previewQuestions = variant.questions.slice(0, variant.styleKey === "image_projection" ? 1 : 3);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">内容预览</p>
      <h3 className="mt-2 text-lg font-semibold text-slate-900">{variant.coverTitle}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-600">{variant.description}</p>
      <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">{getInteractionHint(variant)}</p>

      {variant.styleKey === "image_projection" ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
          {imageUrl ? (
            <img src={imageUrl} alt="投射测试图" className="h-40 w-full rounded-lg object-cover" />
          ) : (
            <div className="flex h-40 w-full items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-500">
              图像待生成
            </div>
          )}
          <p className="mt-2 text-xs font-medium text-slate-500">第一眼图像投射区域</p>
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {previewQuestions.map((question, index) => (
          <article key={question.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Q{index + 1}</p>
            <p className="mt-1 text-sm font-medium text-slate-800">{question.title}</p>
            <div className="mt-2 grid gap-1">
              {question.options.slice(0, 4).map((option) => (
                <p key={option.id} className="text-xs text-slate-600">
                  · {option.text}
                </p>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {variant.hashtags.slice(0, 4).map((tag) => (
          <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
