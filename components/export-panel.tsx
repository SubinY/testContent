"use client";

interface ExportPanelProps {
  exporting: boolean;
  statusText: string;
  onExportHtml: () => Promise<void>;
  onExportScreenshots: () => Promise<void>;
  onExportZip: () => Promise<void>;
}

export default function ExportPanel(props: ExportPanelProps) {
  const { exporting, statusText, onExportHtml, onExportScreenshots, onExportZip } = props;

  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">导出</p>
      <h3 className="mt-2 text-lg font-semibold text-slate-900">导出素材包</h3>
      <p className="mt-1 text-sm leading-6 text-slate-600">
        支持导出独立 HTML、1080x1440（3:4）截图，以及完整 ZIP 包，便于小红书投放和分发。
      </p>

      <div className="mt-4 grid gap-3">
        <button
          type="button"
          onClick={onExportHtml}
          disabled={exporting}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          导出 HTML
        </button>
        <button
          type="button"
          onClick={onExportScreenshots}
          disabled={exporting}
          className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
        >
          导出截图
        </button>
        <button
          type="button"
          onClick={onExportZip}
          disabled={exporting}
          className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
        >
          导出完整 ZIP
        </button>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">状态</p>
        <p className="mt-1 text-sm text-slate-700">{statusText}</p>
      </div>
    </aside>
  );
}
