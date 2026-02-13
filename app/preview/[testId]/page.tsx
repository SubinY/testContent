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

export default function PreviewPage() {
  const showAuxControls = process.env.NEXT_PUBLIC_SHOW_AUX_CONTROLS !== "false";
  const router = useRouter();
  const params = useParams<{ testId: string }>();
  const routeTestId = Array.isArray(params?.testId) ? params?.testId[0] : params?.testId;

  const [mountedTest, setMountedTest] = useState<GeneratedTest | null>(null);
  const [statusText, setStatusText] = useState("准备导出。");
  const [exporting, setExporting] = useState(false);

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

        <section className="card-surface p-4 md:p-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">手机预览</p>
          <PhoneMockup html={htmlContent} title={`${mountedTest.topic}-${selectedVariant.label}`} />
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
