"use client";

import type { TestVariant } from "@/types";

interface TestRendererProps {
  variant: TestVariant;
}

export default function TestRenderer(props: TestRendererProps) {
  const { variant } = props;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">内容预览</p>
      <h3 className="mt-2 text-lg font-semibold text-slate-900">{variant.coverTitle}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-600">{variant.description}</p>

      <div className="mt-4 space-y-3">
        {variant.questions.slice(0, 3).map((question, index) => (
          <article key={question.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Q{index + 1}</p>
            <p className="mt-1 text-sm font-medium text-slate-800">{question.title}</p>
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
