"use client";

import { useMemo, useState } from "react";

import type { DebugEntry, TestVariant } from "@/types";

interface DebugFloatingPanelProps {
  entries: DebugEntry[];
  variants?: TestVariant[];
  title?: string;
}

export default function DebugFloatingPanel(props: DebugFloatingPanelProps) {
  const { entries, variants = [], title = "调试信息" } = props;
  const [open, setOpen] = useState(false);
  const sortedEntries = useMemo(() => [...entries].reverse(), [entries]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 inline-flex h-10 items-center gap-2 rounded-full border border-slate-300 bg-white/95 px-4 text-xs font-semibold text-slate-700 shadow-lg backdrop-blur hover:bg-slate-50"
      >
        Debug
        <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] text-white">{entries.length}</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="h-[80vh] w-[min(980px,100%)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">{title}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                关闭
              </button>
            </div>
            <div className="grid h-[calc(80vh-53px)] gap-0 md:grid-cols-2">
              <section className="border-r border-slate-200 p-3 overflow-hidden">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Debug Trace</p>
                <div className="h-full overflow-auto space-y-2 pr-1">
                  {sortedEntries.length === 0 ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">暂无调试记录</div>
                  ) : (
                    sortedEntries.map((entry) => (
                      <article key={entry.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                        <p className="text-[11px] font-semibold text-slate-700">
                          {entry.at} · {entry.stage}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-600">
                          {entry.source}
                          {entry.provider ? ` / ${entry.provider}` : ""}
                          {entry.model ? ` / ${entry.model}` : ""}
                          {entry.variantLabel ? ` / ${entry.variantLabel}` : ""}
                        </p>
                        <p className="mt-1 text-xs text-slate-700">{entry.message}</p>
                        {entry.payload ? (
                          <pre className="mt-1 max-h-36 overflow-auto whitespace-pre-wrap rounded bg-white p-2 text-[11px] leading-5 text-slate-700">
                            {entry.payload}
                          </pre>
                        ) : null}
                      </article>
                    ))
                  )}
                </div>
              </section>

              <section className="p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Variant Raw Output</p>
                <div className="h-full overflow-auto space-y-2 pr-1">
                  {variants.length === 0 ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">暂无变体原始输出</div>
                  ) : (
                    variants.map((variant) => (
                      <article key={variant.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                        <p className="text-xs font-semibold text-slate-800">
                          {variant.label} · {variant.styleName ?? variant.styleKey}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-600">
                          {variant.generationSource ?? "unknown"} / {variant.textProvider ?? "unknown"} / {variant.textModel ?? "unknown"}
                        </p>
                        <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-white p-2 text-[11px] leading-5 text-slate-700">
                          {variant.rawModelOutput ?? "[no-raw-output]"}
                        </pre>
                      </article>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
