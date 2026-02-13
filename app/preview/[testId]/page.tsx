"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";

import DebugFloatingPanel from "@/components/debug-floating-panel";
import ExportPanel from "@/components/export-panel";
import PhoneMockup from "@/components/phone-mockup";
import TestRenderer from "@/components/test-renderer";
import VariantTabs from "@/components/variant-tabs";
import { buildStandaloneHtml, downloadFullZipBundle, downloadScreenshotsZip, downloadStandaloneHtml } from "@/lib/export";
import { generateSlideScreenshots } from "@/lib/screenshot";
import { loadGeneratedTest } from "@/lib/storage";
import { useTestStore } from "@/store/testStore";
import type { GeneratedTest } from "@/types";

const PREVIEW_PRESETS: Array<{ id: string; label: string; width: number; height: number; hint?: string }> = [
  { id: "xhs", label: "小红书 3:4", width: 360, height: 480, hint: "导出截图为 1080×1440（3:4）" },
  { id: "iphone-se", label: "iPhone SE", width: 375, height: 667 },
  { id: "iphone-14", label: "iPhone 14", width: 390, height: 844 },
  { id: "iphone-max", label: "iPhone 14 Pro Max", width: 430, height: 932 },
  { id: "android", label: "Android", width: 412, height: 915 }
];

export default function PreviewPage() {
  const showAuxControls = process.env.NEXT_PUBLIC_SHOW_AUX_CONTROLS !== "false";
  const router = useRouter();
  const params = useParams<{ testId: string }>();
  const routeTestId = Array.isArray(params?.testId) ? params?.testId[0] : params?.testId;

  const [mountedTest, setMountedTest] = useState<GeneratedTest | null>(null);
  const [statusText, setStatusText] = useState("准备导出。");
  const [exporting, setExporting] = useState(false);
  const [presetId, setPresetId] = useState(PREVIEW_PRESETS[0].id);

  const { currentTest, activeVariantId, setCurrentTest, setActiveVariant } = useTestStore();

  useEffect(() => {
    if (!routeTestId) {
      router.replace("/");
      return;
    }

    if (currentTest?.id === routeTestId) {
      setMountedTest(currentTest);
      return;
    }

    const fromStorage = loadGeneratedTest(routeTestId);
    if (!fromStorage) {
      router.replace("/");
      return;
    }

    setCurrentTest(fromStorage);
    setMountedTest(fromStorage);
  }, [currentTest, routeTestId, router, setCurrentTest]);

  const selectedVariant = useMemo(() => {
    const source = mountedTest ?? currentTest;
    if (!source) {
      return null;
    }

    return source.variants.find((variant) => variant.id === activeVariantId) ?? source.variants[0] ?? null;
  }, [activeVariantId, currentTest, mountedTest]);

  useEffect(() => {
    if (selectedVariant && selectedVariant.id !== activeVariantId) {
      setActiveVariant(selectedVariant.id);
    }
  }, [activeVariantId, selectedVariant, setActiveVariant]);

  const htmlContent = useMemo(() => {
    if (!selectedVariant) {
      return "";
    }
    return buildStandaloneHtml(selectedVariant);
  }, [selectedVariant]);

  const activePreset = useMemo(
    () => PREVIEW_PRESETS.find((item) => item.id === presetId) ?? PREVIEW_PRESETS[0],
    [presetId]
  );

  if (!mountedTest || !selectedVariant) {
    return (
      <main className="page-wrap">
        <div className="card-surface p-8">
          <p className="text-sm text-slate-600">正在加载预览...</p>
        </div>
      </main>
    );
  }

  const runExport = async (task: () => Promise<void>, startText: string, doneText: string) => {
    setExporting(true);
    setStatusText(startText);
    try {
      await task();
      setStatusText(doneText);
    } catch (error) {
      const message = error instanceof Error ? error.message : "导出失败。";
      setStatusText(message);
    } finally {
      setExporting(false);
    }
  };

  const handleExportHtml = async () => {
    await runExport(
      async () => {
        downloadStandaloneHtml(selectedVariant, mountedTest.topic);
      },
      "正在导出 HTML...",
      "HTML 导出完成。"
    );
  };

  const handleExportScreenshots = async () => {
    await runExport(
      async () => {
        const screenshots = await generateSlideScreenshots(selectedVariant);
        await downloadScreenshotsZip(screenshots, mountedTest.topic, selectedVariant);
      },
      "正在渲染截图...",
      "截图导出完成。"
    );
  };

  const handleExportZip = async () => {
    await runExport(
      async () => {
        const screenshots = await generateSlideScreenshots(selectedVariant);
        await downloadFullZipBundle({
          test: mountedTest,
          variant: selectedVariant,
          screenshots
        });
      },
      "正在打包 ZIP...",
      "ZIP 导出完成。"
    );
  };

  return (
    <main className="page-wrap">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="grid gap-5 xl:grid-cols-[minmax(320px,0.9fr)_minmax(420px,1.2fr)_minmax(300px,0.9fr)]"
      >
        <div className="space-y-4 min-w-0">
          <VariantTabs
            variants={mountedTest.variants}
            activeVariantId={selectedVariant.id}
            onChange={(variantId) => setActiveVariant(variantId)}
          />
          <TestRenderer variant={selectedVariant} topicAnalysis={mountedTest.topicAnalysis} />
        </div>

        <section className="card-surface relative p-4 md:p-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">手机预览</p>
            <div className="flex items-center gap-2">
              <label htmlFor="preview-preset" className="text-[11px] font-semibold text-slate-500">
                分辨率
              </label>
              <select
                id="preview-preset"
                value={presetId}
                onChange={(event) => setPresetId(event.target.value)}
                className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-amber-400"
              >
                {PREVIEW_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label} ({preset.width}×{preset.height})
                  </option>
                ))}
              </select>
            </div>
          </div>
          {activePreset.hint ? <p className="mb-3 text-[11px] font-medium text-slate-500">{activePreset.hint}</p> : null}
          <PhoneMockup
            html={htmlContent}
            title={`${mountedTest.topic}-${selectedVariant.label}`}
            viewportWidth={activePreset.width}
            viewportHeight={activePreset.height}
          />
        </section>

        <ExportPanel
          exporting={exporting}
          statusText={statusText}
          onExportHtml={handleExportHtml}
          onExportScreenshots={handleExportScreenshots}
          onExportZip={handleExportZip}
        />
      </motion.section>
      {showAuxControls ? (
        <DebugFloatingPanel
          entries={mountedTest.debugTrace ?? []}
          variants={mountedTest.variants}
          title="预览调试面板"
        />
      ) : null}
    </main>
  );
}
