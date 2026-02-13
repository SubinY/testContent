import html2canvas from "html2canvas";

import type { TestVariant } from "@/types";

async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      reject(new Error("截图生成失败"));
    }, "image/png");
  });
}

function createBaseSlide(accent: string): HTMLDivElement {
  const slide = document.createElement("div");
  slide.style.width = "1080px";
  slide.style.height = "1440px";
  slide.style.padding = "72px";
  slide.style.boxSizing = "border-box";
  slide.style.fontFamily =
    "\"Segoe UI\", \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", sans-serif";
  slide.style.background = "linear-gradient(160deg, #f8f3ea 0%, #fffaf5 60%, #f1f5f9 100%)";
  slide.style.color = "#1f2937";
  slide.style.display = "flex";
  slide.style.flexDirection = "column";
  slide.style.gap = "28px";
  slide.style.border = `3px solid ${accent}`;
  slide.style.borderRadius = "36px";
  return slide;
}

function createTag(text: string, accent: string): HTMLSpanElement {
  const tag = document.createElement("span");
  tag.textContent = text;
  tag.style.display = "inline-flex";
  tag.style.alignItems = "center";
  tag.style.width = "fit-content";
  tag.style.padding = "12px 20px";
  tag.style.borderRadius = "999px";
  tag.style.background = `${accent}20`;
  tag.style.color = accent;
  tag.style.fontWeight = "700";
  return tag;
}

function createTitle(text: string): HTMLHeadingElement {
  const title = document.createElement("h2");
  title.textContent = text;
  title.style.fontSize = "56px";
  title.style.lineHeight = "1.15";
  title.style.margin = "0";
  title.style.fontWeight = "800";
  return title;
}

function createParagraph(text: string, size = 34): HTMLParagraphElement {
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  paragraph.style.margin = "0";
  paragraph.style.fontSize = `${size}px`;
  paragraph.style.lineHeight = "1.45";
  paragraph.style.color = "#334155";
  return paragraph;
}

export async function generateSlideScreenshots(variant: TestVariant): Promise<Record<string, Blob>> {
  if (typeof document === "undefined") {
    return {};
  }

  const fileMap: Record<string, Blob> = {};
  const offscreenRoot = document.createElement("div");
  offscreenRoot.style.position = "fixed";
  offscreenRoot.style.left = "-99999px";
  offscreenRoot.style.top = "0";
  offscreenRoot.style.pointerEvents = "none";
  offscreenRoot.style.opacity = "0";
  document.body.appendChild(offscreenRoot);

  const slideEntries: Array<{ fileName: string; node: HTMLDivElement }> = [];
  const accent = "#d97706";

  const cover = createBaseSlide(accent);
  cover.appendChild(createTag(`变体 ${variant.label}`, accent));
  cover.appendChild(createTitle(variant.coverTitle));
  cover.appendChild(createParagraph(variant.coverSubtitle));
  cover.appendChild(createParagraph(`共 ${variant.questions.length} 题 · 预计 3 分钟`, 28));
  slideEntries.push({ fileName: "screenshots/cover.png", node: cover });

  variant.questions.forEach((question, index) => {
    const slide = createBaseSlide(accent);
    slide.appendChild(createTag(`Q${index + 1}`, accent));
    slide.appendChild(createTitle(question.title));
    slide.appendChild(createParagraph(question.subtitle, 30));

    const list = document.createElement("div");
    list.style.display = "grid";
    list.style.gap = "16px";
    question.options.slice(0, 4).forEach((option, optionIndex) => {
      const row = document.createElement("div");
      row.style.border = "2px solid #dbe4ee";
      row.style.borderRadius = "20px";
      row.style.padding = "18px 22px";
      row.style.fontSize = "30px";
      row.style.background = "#ffffffcc";
      row.textContent = `${String.fromCharCode(65 + optionIndex)}. ${option.text}`;
      list.appendChild(row);
    });

    slide.appendChild(list);
    slideEntries.push({ fileName: `screenshots/q${index + 1}.png`, node: slide });
  });

  variant.results.slice(0, 4).forEach((result, index) => {
    const slide = createBaseSlide(accent);
    slide.appendChild(createTag(`结果 ${index + 1}`, accent));
    slide.appendChild(createTitle(result.title));
    slide.appendChild(createParagraph(result.description, 32));
    slide.appendChild(createParagraph(result.cta, 30));
    slideEntries.push({ fileName: `screenshots/result-${index + 1}.png`, node: slide });
  });

  try {
    for (const entry of slideEntries) {
      offscreenRoot.replaceChildren(entry.node);
      const canvas = await html2canvas(entry.node, {
        backgroundColor: "#f8f3ea",
        width: 1080,
        height: 1440,
        scale: 1,
        useCORS: true
      });
      fileMap[entry.fileName] = await canvasToBlob(canvas);
    }
  } finally {
    offscreenRoot.remove();
  }

  return fileMap;
}
