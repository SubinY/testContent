"use client";

import type { TestVariant } from "@/types";

interface VariantTabsProps {
  variants: TestVariant[];
  activeVariantId: string;
  onChange: (variantId: string) => void;
}

export default function VariantTabs(props: VariantTabsProps) {
  const { variants, activeVariantId, onChange } = props;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-soft">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">变体列表</p>
      <div className="grid gap-2">
        {variants.map((variant) => {
          const active = activeVariantId === variant.id;
          return (
            <button
              key={variant.id}
              type="button"
              onClick={() => onChange(variant.id)}
              className={[
                "cursor-pointer rounded-xl border px-3 py-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
                active
                  ? "border-amber-300 bg-amber-50 text-amber-900"
                  : "border-slate-200 bg-white text-slate-700 hover:border-amber-200 hover:bg-amber-50/60"
              ].join(" ")}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{variant.label}</p>
              <p className="mt-1 line-clamp-2 text-sm font-semibold">{variant.headline}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
