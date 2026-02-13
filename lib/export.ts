import { saveAs } from "file-saver";
import JSZip from "jszip";

import { getTenantConfig } from "@/lib/tenant";
import { buildThemeCssVariables, getThemeById } from "@/lib/themes";
import type { GeneratedTest, TestVariant } from "@/types";

function sanitizeFileName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5-_]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function escapeJsonForScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

interface StandaloneHtmlOptions {
  themeId?: string;
}

export function buildStandaloneHtml(variant: TestVariant, options?: StandaloneHtmlOptions): string {
  const tenant = getTenantConfig();
  const dataJson = escapeJsonForScript(variant);
  const tenantJson = escapeJsonForScript(tenant);
  const theme = getThemeById(options?.themeId);
  const themeVariables = buildThemeCssVariables(theme);
  const colorScheme = theme.id === "night-graphite" ? "dark" : "light";

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${variant.headline}</title>
  <style>
    :root {
      color-scheme: ${colorScheme};
      ${themeVariables}
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background: linear-gradient(
        150deg,
        var(--bg-gradient-start) 0%,
        var(--bg-gradient-mid) 50%,
        var(--bg-gradient-end) 100%
      );
      color: var(--text);
      font-family: var(--font-body);
      padding: 24px;
    }
    .app {
      width: min(720px, 100%);
      background: var(--surface);
      border-radius: var(--radius-lg);
      border: 1px solid var(--border);
      box-shadow: var(--shadow);
      overflow: hidden;
    }
    .header {
      padding: 24px;
      border-bottom: 1px solid var(--border);
      background: var(--surface-muted);
    }
    .label {
      display: inline-flex;
      padding: 6px 12px;
      border-radius: 999px;
      background: var(--accent-soft);
      color: var(--accent-hover);
      font-weight: 700;
      font-size: 12px;
      letter-spacing: .08em;
      text-transform: uppercase;
    }
    h1 {
      margin: 12px 0 8px;
      font-size: 28px;
      line-height: 1.2;
      font-family: var(--font-heading);
    }
    p {
      margin: 0;
      color: var(--muted);
      line-height: 1.55;
    }
    .content {
      padding: 24px;
      display: grid;
      gap: 14px;
    }
    .question-card {
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 16px;
      background: var(--card);
    }
    .question-card h2 {
      margin: 0 0 6px;
      font-size: 20px;
      line-height: 1.35;
      color: var(--text);
      font-family: var(--font-heading);
    }
    .style-note {
      margin-top: 10px;
      border-radius: calc(var(--radius) - 6px);
      padding: 10px 12px;
      font-size: 12px;
      font-weight: 600;
      color: var(--muted);
      background: var(--card-alt);
      border: 1px dashed var(--border);
    }
    .hero-image {
      width: 100%;
      height: 220px;
      object-fit: cover;
      border-radius: calc(var(--radius) - 4px);
      border: 1px solid var(--border);
      margin-top: 14px;
      background: var(--surface-muted);
    }
    .options {
      margin-top: 14px;
      display: grid;
      gap: 10px;
    }
    button {
      width: 100%;
      border: 1px solid var(--border);
      border-radius: calc(var(--radius) - 4px);
      padding: 12px 14px;
      background: var(--surface);
      color: var(--text);
      font-size: 16px;
      font-weight: 600;
      text-align: left;
      cursor: pointer;
      transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease;
    }
    button:hover {
      transform: translateY(-1px);
      border-color: var(--accent);
      box-shadow: var(--accent-shadow);
    }
    button.story-option {
      border-left: 4px solid var(--accent);
      background: var(--card-alt);
    }
    button.attachment-option {
      text-align: center;
      border-radius: 999px;
      font-weight: 700;
      background: var(--surface-muted);
    }
    button.potential-option {
      border-radius: 18px;
      padding: 14px 16px;
      background: linear-gradient(180deg, var(--surface) 0%, var(--card-alt) 100%);
    }
    button.health-option {
      border: 1px solid var(--border);
      background: var(--surface-muted);
    }
    .primary {
      text-align: center;
      background: linear-gradient(135deg, var(--accent), var(--accent-hover));
      color: #fff;
      border: 0;
      font-weight: 700;
      box-shadow: var(--accent-shadow);
    }
    .hidden { display: none; }
    .footer {
      padding: 14px 24px 24px;
      color: var(--muted);
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="app">
    <div class="header">
      <span class="label">变体 ${variant.label}</span>
      <h1 id="title"></h1>
      <p id="desc"></p>
    </div>
    <div class="content">
      <section id="cover" class="question-card">
        <h2 id="coverTitle"></h2>
        <p id="coverSubtitle"></p>
        <img id="coverImage" class="hero-image hidden" alt="测试核心图像" />
        <div id="styleNote" class="style-note hidden"></div>
        <div class="options" style="margin-top: 18px;">
          <button id="startBtn" class="primary">开始测试</button>
        </div>
      </section>
      <section id="questionSection" class="question-card hidden">
        <h2 id="questionTitle"></h2>
        <p id="questionSubtitle"></p>
        <img id="questionImage" class="hero-image hidden" alt="测试题图像" />
        <div class="options" id="options"></div>
      </section>
      <section id="resultSection" class="question-card hidden">
        <h2 id="resultTitle"></h2>
        <p id="resultDescription"></p>
        <p id="resultCta" style="margin-top: 14px; font-weight: 600;"></p>
        <div class="options" style="margin-top: 18px;">
          <button id="restartBtn">再测一次</button>
        </div>
      </section>
    </div>
    <div class="footer" id="brand"></div>
  </div>
  <script>
    const VARIANT = ${dataJson};
    const TENANT = ${tenantJson};
    let index = 0;
    let score = 0;
    const STYLE_KEY = VARIANT.styleKey || "generic";
    const IMAGE_URL =
      Array.isArray(VARIANT.imageAssets) && VARIANT.imageAssets.length > 0
        ? VARIANT.imageAssets[0] && VARIANT.imageAssets[0].url
        : "";

    const title = document.getElementById("title");
    const desc = document.getElementById("desc");
    const coverTitle = document.getElementById("coverTitle");
    const coverSubtitle = document.getElementById("coverSubtitle");
    const coverImage = document.getElementById("coverImage");
    const questionImage = document.getElementById("questionImage");
    const styleNote = document.getElementById("styleNote");
    const cover = document.getElementById("cover");
    const questionSection = document.getElementById("questionSection");
    const questionTitle = document.getElementById("questionTitle");
    const questionSubtitle = document.getElementById("questionSubtitle");
    const options = document.getElementById("options");
    const resultSection = document.getElementById("resultSection");
    const resultTitle = document.getElementById("resultTitle");
    const resultDescription = document.getElementById("resultDescription");
    const resultCta = document.getElementById("resultCta");
    const brand = document.getElementById("brand");

    function reset() {
      index = 0;
      score = 0;
      cover.classList.remove("hidden");
      questionSection.classList.add("hidden");
      resultSection.classList.add("hidden");
    }

    function getStyleNote() {
      if (STYLE_KEY === "image_projection") return "图像投射交互：先看图，再按第一直觉选择。";
      if (STYLE_KEY === "story_scene") return "剧情交互：按场景阶段连续选择。";
      if (STYLE_KEY === "attachment_index") return "量表交互：按关系状态频率作答。";
      if (STYLE_KEY === "life_potential") return "潜力交互：按价值观偏好选择行动路径。";
      if (STYLE_KEY === "mental_health_check") return "自评交互：按近期状态频次选择。";
      return "标准交互：逐题作答并生成结果。";
    }

    function getQuestionPrefix(currentIndex) {
      if (STYLE_KEY === "story_scene") {
        const storyStages = ["森林", "房子", "门", "房间", "遇见的人", "后续节点"];
        return "剧情阶段 · " + (storyStages[currentIndex] || ("阶段" + (currentIndex + 1)));
      }
      if (STYLE_KEY === "attachment_index") return "依恋指数题";
      if (STYLE_KEY === "life_potential") return "潜力路径题";
      if (STYLE_KEY === "mental_health_check") return "状态自评题";
      if (STYLE_KEY === "image_projection") return "第一眼图像投射题";
      return "第" + (currentIndex + 1) + "题";
    }

    function optionClassName() {
      if (STYLE_KEY === "story_scene") return "story-option";
      if (STYLE_KEY === "attachment_index") return "attachment-option";
      if (STYLE_KEY === "life_potential") return "potential-option";
      if (STYLE_KEY === "mental_health_check") return "health-option";
      return "";
    }

    function mountQuestion() {
      const q = VARIANT.questions[index];
      questionTitle.textContent = getQuestionPrefix(index) + " · " + q.title;
      questionSubtitle.textContent = q.subtitle || "";
      if (STYLE_KEY === "image_projection" && IMAGE_URL) {
        questionImage.src = IMAGE_URL;
        questionImage.classList.remove("hidden");
      } else {
        questionImage.classList.add("hidden");
      }
      options.innerHTML = "";

      q.options.forEach((option) => {
        const button = document.createElement("button");
        const cls = optionClassName();
        if (cls) button.classList.add(cls);
        button.textContent = option.text;
        button.addEventListener("click", () => {
          score += Number(option.score || 1);
          index += 1;
          if (index >= VARIANT.questions.length) {
            showResult();
            return;
          }
          mountQuestion();
        });
        options.appendChild(button);
      });
    }

    function showResult() {
      questionSection.classList.add("hidden");
      resultSection.classList.remove("hidden");
      const result = VARIANT.results.find((item) => {
        const [min, max] = item.scoreRange || [0, 999];
        return score >= min && score <= max;
      }) || VARIANT.results[VARIANT.results.length - 1];
      resultTitle.textContent = result.title;
      resultDescription.textContent = result.description;
      resultCta.textContent = result.cta;
    }

    title.textContent = VARIANT.headline;
    desc.textContent = VARIANT.description;
    coverTitle.textContent = VARIANT.coverTitle;
    coverSubtitle.textContent = VARIANT.coverSubtitle;
    if (IMAGE_URL && STYLE_KEY === "image_projection") {
      coverImage.src = IMAGE_URL;
      coverImage.classList.remove("hidden");
    }
    styleNote.textContent = getStyleNote();
    styleNote.classList.remove("hidden");
    brand.textContent = TENANT.name + " · " + TENANT.productName;
    document.getElementById("startBtn").addEventListener("click", () => {
      cover.classList.add("hidden");
      questionSection.classList.remove("hidden");
      mountQuestion();
    });
    document.getElementById("restartBtn").addEventListener("click", reset);
  </script>
</body>
</html>`;
}

export function downloadStandaloneHtml(variant: TestVariant, topic: string, options?: StandaloneHtmlOptions): void {
  const html = buildStandaloneHtml(variant, options);
  const fileName = `${sanitizeFileName(topic)}-${variant.label.toLowerCase()}.html`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  saveAs(blob, fileName);
}

export async function downloadScreenshotsZip(
  screenshots: Record<string, Blob>,
  topic: string,
  variant: TestVariant
): Promise<void> {
  const zip = new JSZip();
  Object.entries(screenshots).forEach(([path, blob]) => {
    zip.file(path, blob);
  });
  const file = await zip.generateAsync({ type: "blob" });
  saveAs(file, `${sanitizeFileName(topic)}-${variant.label.toLowerCase()}-screenshots.zip`);
}

interface ExportReadmeOptions {
  themeId?: string;
  screenshotStrategy?: string;
}

function buildReadme(test: GeneratedTest, variant: TestVariant, options?: ExportReadmeOptions): string {
  const theme = getThemeById(options?.themeId);
  const screenshotStrategy = options?.screenshotStrategy ?? "full-content-slides";
  const analysisLines = test.topicAnalysis
    ? [
        "",
        "主题解构摘要:",
        `- 主题类型: ${test.topicAnalysis.topicType ?? "general"}`,
        `- 测量目标: ${test.topicAnalysis.deconstruction.assessmentGoal}`,
        `- 理论适配度: ${test.topicAnalysis.theoryFramework.confidence.level}`,
        `- 理论组合: ${test.topicAnalysis.theoryFramework.primaryTheories.map((item) => item.name).join("、")}`,
        `- 风格建议: ${test.topicAnalysis.formConstraints.recommendedStyles.join("、")}`,
        `- 特别注意: ${test.topicAnalysis.formConstraints.specialConsiderations.join("；") || "无"}`
      ]
    : [];

  return [
    "TestFlow 导出包说明",
    "",
    `测试ID: ${test.id}`,
    `主题: ${test.topic}`,
    `变体: ${variant.label}`,
    `视觉风格: ${theme.name} (${theme.id})`,
    `截图策略: ${screenshotStrategy}`,
    "截图说明: 每张截图最小 1080x1440，内容较长时自动增高画布，保证关键信息不被裁切。",
    `创建时间: ${test.createdAt}`,
    "",
    "包含文件:",
    "- index.html",
    "- /screenshots/*.png",
    "- /copy/titles.txt",
    "- /copy/content.txt",
    "- /copy/hashtags.txt",
    "- /copy/dm_scripts.json",
    "- README.txt",
    ...analysisLines
  ].join("\n");
}

export async function downloadFullZipBundle(params: {
  test: GeneratedTest;
  variant: TestVariant;
  screenshots: Record<string, Blob>;
  themeId?: string;
  screenshotStrategy?: string;
}): Promise<void> {
  const { test, variant, screenshots, themeId, screenshotStrategy } = params;
  const zip = new JSZip();
  const html = buildStandaloneHtml(variant, { themeId });

  zip.file("index.html", html);

  Object.entries(screenshots).forEach(([path, blob]) => {
    zip.file(path, blob);
  });

  const packageTitles = variant.copyPackage?.titles?.length
    ? variant.copyPackage.titles
    : [variant.headline, variant.coverTitle];
  const packageContent = variant.copyPackage?.content?.length
    ? variant.copyPackage.content
    : [
        variant.description,
        ...variant.questions.map((q, i) => `第${i + 1}题：${q.title}`),
        ...variant.results.map((r, i) => `结果${i + 1}：${r.title} - ${r.description}`)
      ];
  const packageHashtags = variant.copyPackage?.hashtags?.length ? variant.copyPackage.hashtags : variant.hashtags;
  const packageDmScripts = variant.copyPackage?.dmScripts?.length ? variant.copyPackage.dmScripts : variant.dmScripts;

  zip.file("copy/titles.txt", packageTitles.join("\n"));
  zip.file(
    "copy/content.txt",
    packageContent.join("\n")
  );
  zip.file("copy/hashtags.txt", packageHashtags.join("\n"));
  zip.file("copy/dm_scripts.json", JSON.stringify({ scripts: packageDmScripts }, null, 2));
  zip.file("README.txt", buildReadme(test, variant, { themeId, screenshotStrategy }));

  const file = await zip.generateAsync({ type: "blob" });
  saveAs(file, `${sanitizeFileName(test.topic)}-${variant.label.toLowerCase()}-bundle.zip`);
}
