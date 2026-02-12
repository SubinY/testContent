# TestFlow｜Codex 全自动开发 Prompt（最终版）

> 用于**直接提交给 Codex / AI 编程代理**的一次性完整开发指令。
> 目标：**无需人工解释 → 自动完成 V1 可上线版本。**

---

# 0. 你的身份（必须遵守）

你是一名：

* 顶级 **Next.js 14 全栈工程师**
* 精通 **Vercel Serverless / Edge / Static Export**
* 专业 **AI 产品工程架构师**
* 具有 **SaaS 可上线经验**

你的唯一目标：

> **在一次代码生成中，完成可直接部署到 Vercel 的 TestFlow V1 产品。**

禁止：

* 输出教学说明
* 输出伪代码
* 输出未完成 TODO
* 省略文件

必须：

* 生成**完整项目结构**
* 所有代码**可直接运行**
* 满足本文全部技术约束

---

# 1. 产品目标（不可偏离）

构建一个：

> **输入主题 → AI生成心理测试 → 预览 → 导出HTML+截图+文案ZIP 的纯前端 Micro‑SaaS 工具。**

核心原则：

* **工具优先，不做社区，不做账号体系**
* **零后端数据库**
* **可静态部署**
* **5分钟内完成一次完整生成与导出**

---

# 2. 技术强约束（必须完全一致）

## 前端

* Next.js **14 App Router**
* TypeScript **strict true**
* TailwindCSS
* shadcn/ui
* Zustand 状态管理

## AI

* OpenAI 官方 SDK
* 模型：`gpt-4-turbo-preview`
* **SSE 流式返回**

## 浏览器能力

* html2canvas 截图
* JSZip 打包
* FileSaver 下载
* LocalStorage 持久化

## 部署

* **必须支持 Vercel 一键部署**
* `output: "export"` 静态导出兼容

---

# 3. 必须生成的完整目录结构

```txt
app/
  layout.tsx
  page.tsx
  globals.css

  preview/[testId]/page.tsx

  api/generate/route.ts

components/
  phone-mockup.tsx
  variant-tabs.tsx
  export-panel.tsx
  test-renderer.tsx

lib/
  prompts.ts
  storage.ts
  export.ts
  screenshot.ts
  tenant.ts

store/
  testStore.ts

styles/
  themes.ts

public/templates/
  test-template.html

types/
  index.ts
```

**不得缺少任何文件。**

---

# 4. 核心功能必须全部实现

## 4.1 首页

功能：

* 输入主题
* 选择生成数量（1‑5）
* 点击生成 → 调用 `/api/generate`
* 显示**实时生成进度条**
* 成功后跳转 `/preview/[testId]`

---

## 4.2 AI 生成 API（关键）

路径：

```
/app/api/generate/route.ts
```

必须实现：

* **SSE 流式输出**
* **逐变体返回 JSON**
* **失败自动重试 3 次**
* **30 秒超时控制**

返回事件格式：

```
data: {"status":"progress"}
```

禁止一次性返回全部内容。

---

## 4.3 预览页（核心页面）

页面：

```
/preview/[testId]
```

布局：

```
左：A/B/C 变体切换
中：手机模拟器 iframe
右：导出控制面板
```

必须实现：

* iframe 渲染**真实导出 HTML**
* 切换变体**无刷新**
* 支持截图触发

---

## 4.4 导出系统（最重要）

必须支持：

### 1️⃣ 导出独立 HTML

* **单文件**
* 内嵌 CSS
* 内嵌 JSON
* 无任何外链
* 打开即可运行测试

### 2️⃣ 导出截图

自动生成：

* 封面
* Q1‑Q8
* 4种结果页

尺寸：

```
1080 × 1440 PNG
```

### 3️⃣ 导出完整 ZIP

ZIP 内必须包含：

```
index.html
/screenshots/*.png
/copy/titles.txt
/copy/content.txt
/copy/hashtags.txt
/copy/dm_scripts.json
README.txt
```

---

# 5. UI/UX 强设计规范（必须执行）

本项目**强制使用以下设计 skill**：

* frontend-design
* frontend-ui-ux
* ui-ux-pro-max
* web-component-design
* vercel-react-best-practices
* web-artifacts-builder

设计要求：

## 视觉风格

* 极简
* 大留白
* 2xl 圆角
* 轻阴影
* 清晰层级

## 动效

* Framer Motion 页面过渡
* Skeleton Loading
* 按钮微交互

## 可用性

* 单手操作友好
* 明确主按钮
* 不超过 3 步完成生成

---

# 6. AI Prompt 必须内置（不可省略）

必须在：

```
lib/prompts.ts
```

实现：

* SYSTEM PROMPT
* USER PROMPT
* JSON Schema 校验
* 自动修复缺失字段

且：

> **任何生成内容必须保证 100% 合法 JSON。**

---

# 7. 性能与工程质量要求

必须满足：

* 首屏 < 2s
* Lighthouse ≥ 90
* 无 console error
* TypeScript 零报错
* 所有组件可复用

---

# 8. 输出格式要求（给 Codex 的最终指令）

现在开始执行：

> **一次性输出完整项目全部代码文件。**

规则：

1. 按文件路径分块输出
2. 每个文件完整可运行
3. 不允许解释说明
4. 直到项目全部完成才停止

最终目标：

> 我复制到本地 → `npm install` → `npm run build` → **直接部署成功**。

---

# 9. 成功标准（必须满足）

当以下全部成立才算完成：

* 可输入主题生成测试
* 可预览 A/B/C 变体
* 可导出 HTML
* 可导出 1080×1440 截图
* 可下载完整 ZIP
* Vercel 部署成功

---

# 10. 立即开始

现在：

> **从项目根目录开始，输出完整代码。**
