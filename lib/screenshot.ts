import html2canvas from "html2canvas";

import { buildStandaloneHtml } from "@/lib/export";
import type { TestVariant } from "@/types";

const SLIDE_WIDTH = 1080;
const HTML_VIEWPORT_WIDTH = 720;
const SCALE = SLIDE_WIDTH / HTML_VIEWPORT_WIDTH;

interface ScreenshotOptions {
  themeId?: string;
  fullContent?: boolean;
  includeFullPage?: boolean;
}

interface RendererContext {
  iframe: HTMLIFrameElement;
  doc: Document;
  variant: TestVariant;
}

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

async function waitForLayout(frames = 2): Promise<void> {
  for (let index = 0; index < frames; index += 1) {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }
}

function getStyleNote(variant: TestVariant): string {
  if (variant.styleKey === "image_projection") return "图像投射交互：先看图，再按第一直觉选择。";
  if (variant.styleKey === "story_scene") return "剧情交互：按场景阶段连续选择。";
  if (variant.styleKey === "attachment_index") return "量表交互：按关系状态频率作答。";
  if (variant.styleKey === "life_potential") return "潜力交互：按价值观偏好选择行动路径。";
  if (variant.styleKey === "mental_health_check") return "自评交互：按近期状态频次选择。";
  return "标准交互：逐题作答并生成结果。";
}

function getQuestionPrefix(variant: TestVariant, index: number): string {
  if (variant.styleKey === "story_scene") {
    const storyStages = ["森林", "房子", "门", "房间", "遇见的人", "后续节点"];
    return `剧情阶段 · ${storyStages[index] ?? `阶段${index + 1}`}`;
  }
  if (variant.styleKey === "attachment_index") return "依恋指数题";
  if (variant.styleKey === "life_potential") return "潜力路径题";
  if (variant.styleKey === "mental_health_check") return "状态自评题";
  if (variant.styleKey === "image_projection") return "第一眼图像投射题";
  return `第${index + 1}题`;
}

function optionClassName(styleKey: TestVariant["styleKey"]): string {
  if (styleKey === "story_scene") return "story-option";
  if (styleKey === "attachment_index") return "attachment-option";
  if (styleKey === "life_potential") return "potential-option";
  if (styleKey === "mental_health_check") return "health-option";
  return "";
}

async function ensureImagesLoaded(doc: Document): Promise<void> {
  const images = Array.from(doc.images);
  if (images.length === 0) {
    return;
  }
  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }
          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        })
    )
  );
}

function getRequiredElement<T extends HTMLElement>(doc: Document, selector: string): T {
  const element = doc.querySelector(selector);
  if (!element) {
    throw new Error(`截图渲染失败，缺少节点: ${selector}`);
  }
  return element as T;
}

function setVisibleSection(doc: Document, section: "cover" | "question" | "result"): void {
  const cover = getRequiredElement<HTMLElement>(doc, "#cover");
  const questionSection = getRequiredElement<HTMLElement>(doc, "#questionSection");
  const resultSection = getRequiredElement<HTMLElement>(doc, "#resultSection");

  cover.classList.toggle("hidden", section !== "cover");
  questionSection.classList.toggle("hidden", section !== "question");
  resultSection.classList.toggle("hidden", section !== "result");
}

function syncCoverContent(ctx: RendererContext): void {
  const { doc, variant } = ctx;
  getRequiredElement<HTMLElement>(doc, "#title").textContent = variant.headline;
  getRequiredElement<HTMLElement>(doc, "#desc").textContent = variant.description;
  getRequiredElement<HTMLElement>(doc, "#coverTitle").textContent = variant.coverTitle;
  getRequiredElement<HTMLElement>(doc, "#coverSubtitle").textContent = variant.coverSubtitle;

  const styleNote = getRequiredElement<HTMLElement>(doc, "#styleNote");
  styleNote.textContent = getStyleNote(variant);
  styleNote.classList.remove("hidden");

  const imageUrl = variant.imageAssets?.[0]?.url ?? "";
  const coverImage = getRequiredElement<HTMLImageElement>(doc, "#coverImage");
  if (variant.styleKey === "image_projection" && imageUrl) {
    coverImage.src = imageUrl;
    coverImage.classList.remove("hidden");
  } else {
    coverImage.classList.add("hidden");
    coverImage.removeAttribute("src");
  }
}

function syncQuestionContent(ctx: RendererContext, question: TestVariant["questions"][number], index: number): void {
  const { doc, variant } = ctx;
  getRequiredElement<HTMLElement>(doc, "#questionTitle").textContent = `${getQuestionPrefix(variant, index)} · ${question.title}`;
  getRequiredElement<HTMLElement>(doc, "#questionSubtitle").textContent = question.subtitle ?? "";

  const imageUrl = variant.imageAssets?.[0]?.url ?? "";
  const questionImage = getRequiredElement<HTMLImageElement>(doc, "#questionImage");
  if (variant.styleKey === "image_projection" && imageUrl) {
    questionImage.src = imageUrl;
    questionImage.classList.remove("hidden");
  } else {
    questionImage.classList.add("hidden");
    questionImage.removeAttribute("src");
  }

  const optionsContainer = getRequiredElement<HTMLElement>(doc, "#options");
  optionsContainer.innerHTML = "";
  const styleClass = optionClassName(variant.styleKey);

  question.options.forEach((option) => {
    const button = doc.createElement("button");
    button.type = "button";
    if (styleClass) {
      button.classList.add(styleClass);
    }
    button.textContent = option.text;
    optionsContainer.appendChild(button);
  });
}

function syncResultContent(doc: Document, result: TestVariant["results"][number]): void {
  getRequiredElement<HTMLElement>(doc, "#resultTitle").textContent = result.title;
  getRequiredElement<HTMLElement>(doc, "#resultDescription").textContent = result.description;
  getRequiredElement<HTMLElement>(doc, "#resultCta").textContent = result.cta;
}

function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("长图拼接失败"));
    };
    image.src = url;
  });
}

async function mountRendererContext(variant: TestVariant, themeId?: string): Promise<RendererContext> {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-99999px";
  iframe.style.top = "0";
  iframe.style.width = `${HTML_VIEWPORT_WIDTH}px`;
  iframe.style.height = "2400px";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");

  const html = buildStandaloneHtml(variant, { themeId });
  iframe.srcdoc = html;
  document.body.appendChild(iframe);

  await new Promise<void>((resolve, reject) => {
    iframe.onload = () => resolve();
    iframe.onerror = () => reject(new Error("截图渲染失败：iframe 加载异常"));
  });

  const doc = iframe.contentDocument;
  if (!doc) {
    throw new Error("截图渲染失败：无法读取 iframe 文档");
  }

  if (doc.fonts?.ready) {
    await doc.fonts.ready;
  }
  await ensureImagesLoaded(doc);
  await waitForLayout();

  const ctx: RendererContext = { iframe, doc, variant };
  syncCoverContent(ctx);
  setVisibleSection(doc, "cover");
  return ctx;
}

async function captureApp(ctx: RendererContext, fullContent: boolean): Promise<Blob> {
  const app = getRequiredElement<HTMLElement>(ctx.doc, ".app");
  await waitForLayout();

  const renderHeight = fullContent
    ? Math.max(Math.ceil(app.scrollHeight), 1)
    : Math.max(Math.ceil(app.getBoundingClientRect().height), 1);

  ctx.iframe.style.height = `${Math.max(renderHeight + 240, 1200)}px`;
  await waitForLayout(3);

  const canvas = await html2canvas(app, {
    backgroundColor: null,
    width: Math.ceil(app.scrollWidth),
    height: renderHeight,
    scale: SCALE,
    useCORS: true,
    windowWidth: HTML_VIEWPORT_WIDTH,
    windowHeight: renderHeight,
    scrollX: 0,
    scrollY: 0
  });

  return canvasToBlob(canvas);
}

async function createFullPageBlob(blobs: Blob[]): Promise<Blob> {
  if (blobs.length === 0) {
    throw new Error("长图拼接失败：无可用截图");
  }

  const images = await Promise.all(blobs.map((blob) => blobToImage(blob)));
  const totalHeight = images.reduce((sum, image) => sum + image.height, 0);
  const canvas = document.createElement("canvas");
  canvas.width = SLIDE_WIDTH;
  canvas.height = totalHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("长图拼接失败：无法创建画布");
  }

  let offsetY = 0;
  images.forEach((image) => {
    context.drawImage(image, 0, offsetY);
    offsetY += image.height;
  });

  return canvasToBlob(canvas);
}

export async function generateSlideScreenshots(
  variant: TestVariant,
  options?: ScreenshotOptions
): Promise<Record<string, Blob>> {
  if (typeof document === "undefined") {
    return {};
  }

  const fullContent = options?.fullContent ?? true;
  const fileMap: Record<string, Blob> = {};
  const orderedBlobs: Blob[] = [];
  const ctx = await mountRendererContext(variant, options?.themeId);

  try {
    setVisibleSection(ctx.doc, "cover");
    syncCoverContent(ctx);
    fileMap["screenshots/cover.png"] = await captureApp(ctx, fullContent);
    orderedBlobs.push(fileMap["screenshots/cover.png"]);

    for (let index = 0; index < variant.questions.length; index += 1) {
      setVisibleSection(ctx.doc, "question");
      syncQuestionContent(ctx, variant.questions[index], index);
      const fileName = `screenshots/q${index + 1}.png`;
      fileMap[fileName] = await captureApp(ctx, fullContent);
      orderedBlobs.push(fileMap[fileName]);
    }

    for (let index = 0; index < variant.results.length; index += 1) {
      setVisibleSection(ctx.doc, "result");
      syncResultContent(ctx.doc, variant.results[index]);
      const fileName = `screenshots/result-${index + 1}.png`;
      fileMap[fileName] = await captureApp(ctx, fullContent);
      orderedBlobs.push(fileMap[fileName]);
    }

    if (options?.includeFullPage) {
      fileMap["screenshots/full-page.png"] = await createFullPageBlob(orderedBlobs);
    }
  } finally {
    ctx.iframe.remove();
  }

  return fileMap;
}
