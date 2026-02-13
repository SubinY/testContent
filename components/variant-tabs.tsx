"use client";

import type { TestVariant } from "@/types";

interface VariantTabsProps {
  variants: TestVariant[];
  activeVariantId: string;
  onChange: (variantId: string) => void;
}

export default function VariantTabs(props: VariantTabsProps) {
  const { variants, activeVariantId, onChange } = props;

  const renderApiPill = (label: string, value: string, active: boolean) => (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        active ? "border-amber-300 bg-amber-100/70 text-amber-900" : "border-slate-200 bg-slate-100 text-slate-600"
      ].join(" ")}
    >
      {label}: {value}
    </span>
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-soft">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">变体列表</p>
      <div className="grid gap-2">
        {variants.map((variant) => {
          const active = activeVariantId === variant.id;
          const imageUrl = variant.imageAssets?.[0]?.url;
          return (
            <div
              key={variant.id}
              className={[
                "rounded-xl border px-3 py-3 transition-all duration-200",
                active ? "border-amber-300 bg-amber-50 text-amber-900" : "border-slate-200 bg-white text-slate-700"
              ].join(" ")}
            >
              <button
                type="button"
                onClick={() => onChange(variant.id)}
                className="w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{variant.label}</p>
                <p className="mt-1 line-clamp-2 text-sm font-semibold">{variant.headline}</p>
              </button>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {renderApiPill(
                  "Text API",
                  `${(variant.textProvider ?? "local").toUpperCase()}${variant.textModel ? `/${variant.textModel}` : ""}`,
                  active
                )}
                {variant.imageProvider
                  ? renderApiPill("Image API", `${variant.imageProvider.toUpperCase()}/${variant.imageModel ?? "-"}`, active)
                  : renderApiPill("Image API", "none", active)}
              </div>

              {imageUrl ? (
                <a
                  href={imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block break-all text-xs font-medium text-sky-700 underline underline-offset-2 hover:text-sky-800"
                  title={imageUrl}
                >
                  Image URL: {imageUrl}
                </a>
              ) : null}
              {variant.styleName ? (
                <p className="mt-1 text-[11px] font-medium text-slate-500">风格：{variant.styleName}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
