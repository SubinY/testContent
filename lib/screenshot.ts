import html2canvas from "html2canvas";

import { getThemeById, type ThemePreset } from "@/lib/themes";
import type { TestVariant } from "@/types";

const SLIDE_WIDTH = 1080;
const MIN_SLIDE_HEIGHT = 1440;
const SLIDE_PADDING = 72;

interface ScreenshotOptions {
  themeId?: string;
  fullContent?: boolean;
  includeFullPage?: boolean;
}

interface SlideEntry {
  fileName: string;
  node: HTMLDivElement;
  minHeight?: number;
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

function waitForLayout(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function createBaseSlide(theme: ThemePreset): HTMLDivElement {
  const slide = document.createElement("div");
  slide.style.width = `${SLIDE_WIDTH}px`;
  slide.style.minHeight = `${MIN_SLIDE_HEIGHT}px`;
  slide.style.padding = `${SLIDE_PADDING}px`;
  slide.style.boxSizing = "border-box";
  slide.style.fontFamily = theme.tokens.fontBody;
  slide.style.background = `linear-gradient(160deg, ${theme.tokens.bgGradientStart} 0%, ${theme.tokens.bgGradientMid} 58%, ${theme.tokens.bgGradientEnd} 100%)`;
  slide.style.color = theme.tokens.text;
  slide.style.display = "flex";
  slide.style.flexDirection = "column";
  slide.style.gap = "28px";
  slide.style.border = `3px solid ${theme.tokens.accent}`;
  slide.style.borderRadius = theme.tokens.radiusLarge;
  slide.style.boxShadow = theme.tokens.shadow;
  return slide;
}

function createTag(text: string, theme: ThemePreset): HTMLSpanElement {
  const tag = document.createElement("span");
  tag.textContent = text;
  tag.style.display = "inline-flex";
  tag.style.alignItems = "center";
  tag.style.width = "fit-content";
  tag.style.padding = "12px 20px";
  tag.style.borderRadius = "999px";
  tag.style.background = theme.tokens.accentSoft;
  tag.style.color = theme.tokens.accentHover;
  tag.style.fontWeight = "700";
  tag.style.fontSize = "26px";
  return tag;
}

function createTitle(text: string, theme: ThemePreset): HTMLHeadingElement {
  const title = document.createElement("h2");
  title.textContent = text;
  title.style.fontSize = "56px";
  title.style.lineHeight = "1.16";
  title.style.margin = "0";
  title.style.fontWeight = "800";
  title.style.fontFamily = theme.tokens.fontHeading;
  title.style.color = theme.tokens.text;
  return title;
}

function createParagraph(text: string, theme: ThemePreset, size = 32): HTMLParagraphElement {
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  paragraph.style.margin = "0";
  paragraph.style.fontSize = `${size}px`;
  paragraph.style.lineHeight = "1.48";
  paragraph.style.color = theme.tokens.muted;
  return paragraph;
}

function createQuestionOptions(theme: ThemePreset, options: TestVariant["questions"][number]["options"]): HTMLDivElement {
  const list = document.createElement("div");
  list.style.display = "grid";
  list.style.gap = "16px";

  options.forEach((option, optionIndex) => {
    const row = document.createElement("div");
    row.style.border = `2px solid ${theme.tokens.border}`;
    row.style.borderRadius = theme.tokens.radius;
    row.style.padding = "18px 22px";
    row.style.fontSize = "30px";
    row.style.lineHeight = "1.4";
    row.style.background = theme.tokens.surface;
    row.style.color = theme.tokens.text;
    row.textContent = `${String.fromCharCode(65 + optionIndex)}. ${option.text}`;
    list.appendChild(row);
  });

  return list;
}

function createCoverSlide(variant: TestVariant, theme: ThemePreset): HTMLDivElement {
  const slide = createBaseSlide(theme);
  slide.appendChild(createTag(`变体 ${variant.label}`, theme));
  slide.appendChild(createTitle(variant.coverTitle, theme));
  slide.appendChild(createParagraph(variant.coverSubtitle, theme));
  slide.appendChild(createParagraph(`共 ${variant.questions.length} 题 · 预计 3 分钟`, theme, 28));
  return slide;
}

function createQuestionSlide(
  question: TestVariant["questions"][number],
  index: number,
  theme: ThemePreset
): HTMLDivElement {
  const slide = createBaseSlide(theme);
  slide.appendChild(createTag(`Q${index + 1}`, theme));
  slide.appendChild(createTitle(question.title, theme));
  slide.appendChild(createParagraph(question.subtitle, theme, 30));
  slide.appendChild(createQuestionOptions(theme, question.options));
  return slide;
}

function createResultSlide(result: TestVariant["results"][number], index: number, theme: ThemePreset): HTMLDivElement {
  const slide = createBaseSlide(theme);
  slide.appendChild(createTag(`结果 ${index + 1}`, theme));
  slide.appendChild(createTitle(result.title, theme));
  slide.appendChild(createParagraph(result.description, theme, 30));
  slide.appendChild(createParagraph(result.cta, theme, 30));
  return slide;
}

function createLongPageSlide(slides: SlideEntry[], theme: ThemePreset): HTMLDivElement {
  const container = document.createElement("div");
  container.style.width = `${SLIDE_WIDTH}px`;
  container.style.padding = "48px";
  container.style.boxSizing = "border-box";
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = "24px";
  container.style.background = `linear-gradient(160deg, ${theme.tokens.bgGradientStart} 0%, ${theme.tokens.bgGradientMid} 58%, ${theme.tokens.bgGradientEnd} 100%)`;
  container.style.borderRadius = theme.tokens.radiusLarge;

  slides.forEach((entry) => {
    const card = entry.node.cloneNode(true) as HTMLDivElement;
    card.style.width = "100%";
    card.style.minHeight = "0";
    card.style.height = "auto";
    card.style.padding = "48px";
    card.style.border = `2px solid ${theme.tokens.border}`;
    card.style.borderRadius = theme.tokens.radiusLarge;
    card.style.background = theme.tokens.card;
    container.appendChild(card);
  });

  return container;
}

async function renderSlide(entry: SlideEntry, offscreenRoot: HTMLDivElement, fullContent: boolean, theme: ThemePreset): Promise<Blob> {
  offscreenRoot.replaceChildren(entry.node);
  await waitForLayout();

  const minHeight = entry.minHeight ?? MIN_SLIDE_HEIGHT;
  const computedHeight = Math.ceil(entry.node.scrollHeight);
  const renderHeight = fullContent ? Math.max(minHeight, computedHeight) : minHeight;
  entry.node.style.height = `${renderHeight}px`;

  await waitForLayout();

  const canvas = await html2canvas(entry.node, {
    backgroundColor: theme.tokens.screenshotBackground,
    width: SLIDE_WIDTH,
    height: renderHeight,
    scale: 1,
    useCORS: true,
    windowWidth: SLIDE_WIDTH,
    windowHeight: renderHeight,
    scrollX: 0,
    scrollY: 0
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

  const theme = getThemeById(options?.themeId);
  const fullContent = options?.fullContent ?? true;
  const fileMap: Record<string, Blob> = {};

  const offscreenRoot = document.createElement("div");
  offscreenRoot.style.position = "fixed";
  offscreenRoot.style.left = "-99999px";
  offscreenRoot.style.top = "0";
  offscreenRoot.style.pointerEvents = "none";
  offscreenRoot.style.opacity = "0";
  document.body.appendChild(offscreenRoot);

  const slideEntries: SlideEntry[] = [];
  slideEntries.push({
    fileName: "screenshots/cover.png",
    node: createCoverSlide(variant, theme)
  });

  variant.questions.forEach((question, index) => {
    slideEntries.push({
      fileName: `screenshots/q${index + 1}.png`,
      node: createQuestionSlide(question, index, theme)
    });
  });

  variant.results.forEach((result, index) => {
    slideEntries.push({
      fileName: `screenshots/result-${index + 1}.png`,
      node: createResultSlide(result, index, theme)
    });
  });

  if (options?.includeFullPage) {
    slideEntries.push({
      fileName: "screenshots/full-page.png",
      node: createLongPageSlide(slideEntries, theme),
      minHeight: MIN_SLIDE_HEIGHT
    });
  }

  try {
    for (const entry of slideEntries) {
      fileMap[entry.fileName] = await renderSlide(entry, offscreenRoot, fullContent, theme);
    }
  } finally {
    offscreenRoot.remove();
  }

  return fileMap;
}
