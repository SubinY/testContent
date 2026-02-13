# TestFlow V1 使用文档

基于 Next.js 14 的心理测试生成与导出系统，支持：

- SSE 流式生成（逐变体返回）
- 预览多变体（按请求 `count` 抽样风格）
- 导出独立 HTML
- 导出“看全”截图包（宽 1080，最小高 1440，内容超长自动增高）
- 导出完整 ZIP（HTML + 截图 + 私信素材）

---

## 1. 本地启动

```bash
npm install
cp .env.example .env.local
npm run dev
```

浏览器打开 `http://localhost:3000`

首页支持两种运行模式：
- `API测试`：调用 `/api/generate` 与远程模型
- `本地测试`：不调用远程 API，直接生成 5 种本地模板（用于 UI 联调）

---

## 2. 环境变量配置

`.env.local` 示例：

```env
# 模型选择：auto | openai | deepseek | modelgate | local
LLM_PROVIDER=auto

# OpenAI
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4-turbo-preview

# DeepSeek（OpenAI 兼容接口）
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1

# ModelGate（文字，OpenAI 兼容）
MODELGATE_API_KEY=
MODELGATE_BASE_URL=https://mg.aid.pub/v1
MODELGATE_MODEL=gpt-4

# ModelGate（图像）
MODELGATE_IMAGE_API_KEY=
MODELGATE_IMAGE_URL=https://mg.aid.pub/api/v1/images/generations
MODELGATE_IMAGE_MODEL=Nano-Banana
MODELGATE_IMAGE_SIZE=1024x1024
MODELGATE_IMAGE_OUTPUT_FORMAT=png

# Nano Banana（图像生成）
NANO_BANANA_API_KEY=
NANO_BANANA_BASE_URL=https://grsai.dakka.com.cn
NANO_BANANA_MODEL=nano-banana-fast
NANO_BANANA_ASPECT_RATIO=auto
NANO_BANANA_IMAGE_SIZE=1K
```

ModelGate 说明：
- 官网与模型列表：`https://modelgate.net/models`
- 文字端点（OpenAI 兼容）：`https://mg.aid.pub/v1`
- 图像端点：`https://mg.aid.pub/api/v1/images/generations`

---

## 3. 统一大模型接入设计（已完成）

### 3.1 目录结构

- `lib/llm/types.ts`：统一 Provider 接口与输入输出类型
- `lib/llm/providers/openai.ts`：OpenAI 实现
- `lib/llm/providers/deepseek.ts`：DeepSeek 实现
- `lib/llm/client.ts`：Provider 选择、可用性检测、失败切换
- `app/api/generate/route.ts`：业务 API，调用统一 LLM 客户端

### 3.2 选择策略

- `auto`：优先 ModelGate，失败切 DeepSeek，再切 OpenAI，最后走 local 生成
- `openai`：仅使用 OpenAI；失败时不切换 DeepSeek，直接走 local 兜底
- `deepseek`：仅使用 DeepSeek；失败时不切换 OpenAI，直接走 local 兜底
- `modelgate`：仅使用 ModelGate；失败时按上层策略处理（strictRemote 下直接报错）
- `local`：仅本地生成，不调用远程模型

### 3.3 每次请求动态指定 Provider

`POST /api/generate` 请求体支持：

```json
{
  "topic": "拖延症",
  "count": 3,
  "provider": "deepseek"
}
```

`provider` 可选：`auto | openai | deepseek | modelgate | local`

### 3.4 风格抽样与结构差异化

- 每次请求按 `count` 从 5 种风格中**无重复抽样**，不浪费 token
- 5 种风格：图像投射型 / 场景剧情型 / 依恋指数型 / 人生潜力型 / 心理健康自评型
- 每种风格有独立题目结构（题量与题干组织不同）
- 图像投射型会追加调用图像生成接口：优先 ModelGate（已配置 `MODELGATE_IMAGE_*`），否则回退 Nano Banana

---

## 4. API 说明

### 4.1 生成接口

- 路径：`/api/generate`
- 方法：`POST`

请求体：

```json
{
  "topic": "procrastination",
  "count": 3,
  "provider": "auto"
}
```

### 4.2 SSE 返回格式

```txt
data: {"status":"progress","progress":10,"message":"Generating variant A..."}

data: {"status":"variant","index":0,"total":3,"variant":{...}}

data: {"status":"done","test":{...}}
```

失败：

```txt
data: {"status":"error","message":"..."}
```

---

## 5. 导出能力

预览页右侧导出面板支持：

1. `Export HTML`
2. `Export Screenshots`
3. `Export Full ZIP`

V4 迭代新增：

- 预览中栏可切换多套风格主题（暖杏、薄荷绿、克莱因蓝、奶油黄、极简白、暗色）
- 导出 HTML 与截图都跟随当前主题
- 截图采用“看全”策略：每页截图最小 `1080x1440`，内容较长时自动增高，避免裁切
- ZIP 内 `README.txt` 会记录当前主题与截图策略

变体列表会显示每个变体实际调用来源：
- `Text API`：`MODELGATE / OPENAI / DEEPSEEK / LOCAL`
- `Image API`：`MODELGATE / NANO-BANANA / none`
- 若生成了图像，会附带可点击的 `Image URL` 便于检阅图片是否正确渲染

完整 ZIP 内容：

- `index.html`
- `/screenshots/*.png`
- `/material/copy.txt`
- `/material/scripts.txt`
- `README.txt`

---

## 6. 如何新增其他模型（复用到后续项目）

只需 3 步：

1. 在 `lib/llm/providers/` 新建 Provider，实现 `LlmProvider` 接口
2. 在 `lib/llm/client.ts` 注册 Provider 和优先级
3. 在 `.env.example` 增加对应变量

这样就能保持业务层（`/api/generate`）不变，后续项目可直接复用 `lib/llm/*`。

---

## 7. 构建与部署

```bash
npm run build
```

说明：

- 当前仓库已通过 `npm run typecheck`
- 若在受限终端环境出现 `spawn EPERM`，通常是系统权限导致 Next.js worker 无法拉起，不是业务代码错误
- 在本机正常权限终端或 Vercel 上可正常构建部署

静态导出兼容：

- 设置 `NEXT_OUTPUT_MODE=export` 后会启用 `next.config.mjs` 中的 `output: "export"`
- 注意：静态导出模式不包含运行时 API 路由

---

## 8. 端到端流程图（从输入主题开始）

下面的流程图覆盖：输入测试主题 -> 风格抽样 -> 逐变体生成题目/答案 -> 图像风格调用（ModelGate 优先，Nano Banana 回退）-> 预览 -> 导出 HTML/截图/ZIP。

```mermaid
flowchart TD
  %% ==============
  %% Frontend
  %% ==============
  subgraph FE[前端 /app]
    FE1[用户输入: topic\n选择: count(1-5), provider(auto/modelgate/openai/deepseek/local)] --> FE2[POST /api/generate]
    FE2 --> FE3[读取 SSE: progress/variant/done/error]
    FE3 -->|variant 事件| FE4[更新生成日志/进度\n逐个收到变体结果]
    FE3 -->|done 事件| FE5[保存到 LocalStorage\nlib/storage.ts: saveGeneratedTest + saveLatestTestId]
    FE5 --> FE6[写入 Zustand store\nstore/testStore.ts: setCurrentTest]
    FE6 --> FE7[跳转预览页\n/preview/[testId]]
  end

  %% ==============
  %% Backend
  %% ==============
  subgraph API[后端 API /app/api/generate/route.ts]
    API0[接收 JSON: {topic,count,provider}] --> API1[zod 校验参数\ntopic 2-120, count 1-5]
    API1 --> API2[决定 provider\n优先: 请求体 provider\n否则: env LLM_PROVIDER]
    API2 --> API2A[按 count 抽样风格\nsampleAssessmentStyles(count)]
    API2A --> API3[构造 UnifiedLlmClient + ImageClient]
    API3 --> API4[开始 SSE Stream\nReadableStream]

    API4 --> API5{循环 index=0..count-1}
    API5 --> API6[取本轮 style + label]
    API6 --> API7[发送 progress: 生成 label(风格名) 变体]
    API7 --> API8[createVariantWithProvider()]
    API8 --> API9[发送 variant 事件\n包含完整 TestVariant JSON]
    API9 --> API10[发送 progress: label 完成]
    API10 --> API5

    API5 -->|循环结束| API11[组装 GeneratedTest\n{id=uuid, topic, createdAt, variants}]
    API11 --> API12[发送 done 事件\n包含 GeneratedTest]
  end

  %% ==============
  %% Variant generation details
  %% ==============
  subgraph GEN[变体生成 /lib/prompts.ts]
    G0{forceLocal?\n或 hasRemoteProvider=false} -->|是| G1[generateLocalVariant()\n本地兜底生成\n(可离线跑通)]
    G0 -->|否| G2[最多重试 3 次\n每次 attempt 间隔 0.5s/1s/1.5s]
    G2 --> G3[client.generate()]
    G3 --> G4[buildSystemPrompt(label,style)\n注入心理学理论/风格约束]
    G3 --> G5[buildUserPrompt(topic,label,style)\n注入结构规则(题量/题型)]
    G3 --> G6[模型返回文本 content\n要求是 JSON 字符串]
    G6 --> G7[parseModelJson()\n从输出中提取/解析 JSON]
    G7 --> G8[repairVariantPayload(payload,{topic,label,style})\n字段修复 + 风格结构规范化]
    G8 --> G9[校验 schema (zod)\n题量可变(1~12) + 固定4结果卡]
    G9 --> G10[normalizeQuestions/Results\n按风格产出不同题目结构]
    G10 --> G11{style.requiresImage?}
    G11 -->|是| G12[ModelGateImage/NanoBanana.generate()\n附加 imageAssets(url/prompt)]
    G11 -->|否| G13[直接返回变体]
  end

  %% ==============
  %% LLM providers
  %% ==============
  subgraph LLM[统一大模型 /lib/llm]
    L0[UnifiedLlmClient.generate()] --> L1{provider 选择}
    L1 -->|openai| L2[仅 OpenAI]
    L1 -->|deepseek| L3[仅 DeepSeek]
    L1 -->|auto| L4[DeepSeek -> OpenAI]
    L2 --> L5[provider.generate()\nchat.completions]
    L3 --> L5
    L4 --> L5
    L5 --> L6[返回 {content, provider, model}]
    L5 -->|失败| L7[上层回退 local 模板]
  end

  %% ==============
  %% Preview + Export
  %% ==============
  subgraph OUT[预览与导出 /app/preview + /lib]
    O1[预览页加载 testId] --> O2[优先用 store.currentTest\n否则 LocalStorage loadGeneratedTest]
    O2 --> O3[选择变体 A/B/C...\ncomponents/variant-tabs.tsx]
    O3 --> O4[渲染预览 HTML\nlib/export.ts: buildStandaloneHtml]
    O4 --> O5[PhoneMockup iframe 预览\ncomponents/phone-mockup.tsx]

    O4 --> O6[导出 HTML\nlib/export.ts: downloadStandaloneHtml]
    O4 --> O7[导出截图 ZIP\nlib/screenshot.ts + lib/export.ts]
    O4 --> O8[导出完整 ZIP\nHTML + 截图 + 文案包\nlib/export.ts: downloadFullZipBundle]
  end

  %% Cross-links
  FE2 --> API0
  API8 --> G0
  G3 --> L0
  G12 --> API9
```

### “题目”和“答案”是怎么生成的

- “多套测试题目”对应 `count` 个变体，在 `app/api/generate/route.ts` 中先按 `count` 从 5 种风格无重复抽样，再逐个生成并通过 SSE 推送。
- 每个变体的“题目”由 `questions` 字段表示，但不再固定 8 题；题目数量与结构由风格决定（例如图像投射型 1 题、剧情型 5 题、依恋指数型 10 题等）。
- 每个变体的“答案”对应 `results`（固定 4 张结果卡）：包含 `title/description/cta`，以及 `scoreRange`（分数区间）。
- 导出的独立 HTML 里会把用户每题选择的 `score` 进行累加得到总分 `score`，再按 `results[*].scoreRange` 匹配落在哪个区间来展示对应结果卡（见 `lib/export.ts: buildStandaloneHtml()` 的内嵌脚本逻辑）。
- 图像投射型会在文案生成后调用图像客户端（`lib/image/modelgate.ts` 或 `lib/image/nano-banana.ts`）生成图像 URL，并挂到 `variant.imageAssets`。
- 当远程模型输出缺字段/格式不稳时，会走 `lib/prompts.ts: repairVariantPayload()` 做结构修复、字段兜底、规范化；若远程模型不可用/多次失败，会直接走 `generateLocalVariant()` 通用模板兜底。

