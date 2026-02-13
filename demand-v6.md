# TestFlow V6 ModelGate 模型聚合接入需求文档

## 项目背景与 V6 目标

当前文本生成依赖 **DeepSeek**、图片生成依赖 **grsai（Nano Banana）** 等直连 API，存在**性价比不高、响应较慢**的问题。V6 引入 [ModelGate](https://modelgate.net/models) 作为**模型聚合商**，统一通过其 API 访问多模型，在保持现有能力（测评生成、小红书文案、图片生成）的前提下，支持通过 ModelGate 使用文字与图像能力，便于切换模型、降低成本、提升速度。

**核心诉求**：

1. **文字类（LLM）**：支持通过 ModelGate 的 **OpenAI 兼容端点** 调用聊天模型，使用方式参考「图二」：`base_url = https://mg.aid.pub/v1`，`Authorization: Bearer <api_key>`，与现有 provider 体系兼容。
2. **图像类**：支持通过 ModelGate 的**图像生成接口**调用画图，使用方式参考「图一」：`POST https://mg.aid.pub/api/v1/images/generations`，请求体含 `model`、`prompt`、`size`、`output_type`、`output_format` 等。
3. **环境变量**：为 ModelGate 文字与图像分别定义清晰的环境变量，便于部署与切换；现有 DeepSeek / grsai 相关变量可保留作备用，但默认或推荐路径可切至 ModelGate。
4. **Provider 选项**：前端与 API 增加 **modelgate** 作为可选「模型提供方」，与 auto / openai / deepseek / local 并列；选择 modelgate 时，测评生成与小红书文案生成走 ModelGate 文字 API，图片生成（若启用）走 ModelGate 图像 API。

---

## 需求一：ModelGate 文字类（LLM）接入

### 目标

- 通过 ModelGate **OpenAI 兼容 API** 调用大语言模型，用于：测评生成（主题解构、变体生成）、小红书文案生成（标题/正文/话题）。
- 接入方式与「图二」一致：使用 `openai` 兼容客户端，`base_url = https://mg.aid.pub/v1`，`api_key` 为 ModelGate 提供的密钥。

### 参考（图二）

- 安装：`pip install openai`（Node 侧使用 `openai` 或等效 SDK）。
- 客户端配置：
  - `api_key`: ModelGate 密钥（占位符 `your-modelgate-key`）。
  - `base_url`: `https://mg.aid.pub/v1`。
- 调用：`client.chat.completions.create(model="gpt-4", messages=[...])`，model 可为 gpt-4、claude-3-5-sonnet、gemini-pro 等 ModelGate 支持的模型。

### 迭代内容

1. **Provider 扩展**
   - 类型 `LlmProviderSelection` 增加 `"modelgate"`：`"auto" | "openai" | "deepseek" | "modelgate" | "local"`。
   - 服务端 `/api/generate` 的 provider 校验与路由支持 `modelgate`；当 `provider === "modelgate"` 时，使用 ModelGate 配置的 OpenAI 兼容客户端发起聊天请求。

2. **ModelGate 文字用环境变量**
   - **`MODELGATE_API_KEY`**（必填，当选用 modelgate 时）：ModelGate 控制台获取的 API Key，用于 `Authorization: Bearer <key>`。
   - **`MODELGATE_BASE_URL`**（可选）：默认 `https://mg.aid.pub/v1`，与图二一致；若 ModelGate 提供不同地域或版本端点可覆盖。
   - **`MODELGATE_MODEL`**（可选）：默认可用 `gpt-4` 或项目当前推荐的模型名（如 `deepseek-chat` 在 ModelGate 上的对应标识），用于 `chat.completions.create` 的 `model` 参数。

3. **客户端实现**
   - 在 `lib/llm/providers/` 下新增 **modelgate** 提供商（或复用 OpenAI 兼容基类），构造 `OpenAI({ apiKey: process.env.MODELGATE_API_KEY, baseURL: process.env.MODELGATE_BASE_URL ?? "https://mg.aid.pub/v1" })`，`model` 取自 `process.env.MODELGATE_MODEL`。
   - `lib/llm/client.ts` 中 provider 列表与优先级支持 `modelgate`（例如 auto 时可选：modelgate → deepseek → openai，或按产品定序）。

4. **与 RunMode 的配合**
   - `RUN_MODE=local` 时仍不调用任何远程 LLM，包括 ModelGate；仅当 `RUN_MODE=api` 且 provider 为 modelgate 时使用 ModelGate 文字 API。

### 验收

- 选择「模型提供方：ModelGate」时，测评生成与小红书文案生成请求发往 `https://mg.aid.pub/v1`（或配置的 `MODELGATE_BASE_URL`），且带 `Authorization: Bearer <MODELGATE_API_KEY>`。
- `.env.example` 与文档中已声明 `MODELGATE_API_KEY`、`MODELGATE_BASE_URL`、`MODELGATE_MODEL`，部署时配置后即可使用。

---

## 需求二：ModelGate 图像生成接入

### 目标

- 通过 ModelGate **图像生成 API** 生成测评配图（如图像投射类变体），使用方式与「图一」一致。
- 接口：`POST https://mg.aid.pub/api/v1/images/generations`，请求头 `Authorization: Bearer <api_key>`，请求体为 JSON。

### 参考（图一）

- URL：`https://mg.aid.pub/api/v1/images/generations`。
- Headers：`Authorization: Bearer mg-your-api-key`，`Content-Type: application/json`。
- Body 示例：`model: "Nano-Banana"`，`prompt: "A cat wearing a spacesuit"`，`size: "1024x1024"`，`output_type: "base64"`，`output_format: "png"`。
- 响应：返回生成结果（如 base64 图像），需解析后转为可用的 URL 或 Buffer 供前端/存储使用。

### 迭代内容

1. **环境变量**
   - **`MODELGATE_IMAGE_API_KEY`**（可选，与文字可同键或分键）：图像接口用的 API Key；若不配置可回退使用 `MODELGATE_API_KEY`，便于单键统一。
   - **`MODELGATE_IMAGE_URL`**（可选）：默认 `https://mg.aid.pub/api/v1/images/generations`。
   - **`MODELGATE_IMAGE_MODEL`**（可选）：默认 `Nano-Banana`，与图一一致；可改为 ModelGate 支持的其它图像模型标识。
   - **`MODELGATE_IMAGE_SIZE`**（可选）：如 `1024x1024`，与图一一致。
   - **`MODELGATE_IMAGE_OUTPUT_FORMAT`**（可选）：如 `png`。

2. **实现方式**
   - 在 `lib/image/` 下新增 **modelgate** 图像生成模块（或扩展现有 nano-banana 为「后端可配置」），当配置了 ModelGate 图像相关环境变量时，调用 `MODELGATE_IMAGE_URL`，使用 `MODELGATE_IMAGE_API_KEY`（或 `MODELGATE_API_KEY`）作为 Bearer，body 中传入 `model`、`prompt`、`size`、`output_type`、`output_format`。
   - 与现有图片生成调用点（如 `/api/generate` 中 enableImageVariants 时的图像生成）衔接：可通过环境变量或 RunMode 决定使用「grsai/Nano Banana 直连」还是「ModelGate 图像 API」，推荐默认使用 ModelGate（当相应 env 已配置时）。

3. **与 RunMode 的配合**
   - `RUN_MODE=local` 时不调用 ModelGate 图像 API，使用占位图或跳过；仅 `RUN_MODE=api` 且启用图像生成时请求 ModelGate 图像端点。

### 验收

- 当配置 `MODELGATE_IMAGE_API_KEY` 与 `MODELGATE_IMAGE_URL` 后，图像生成请求发往 `https://mg.aid.pub/api/v1/images/generations`，携带 Bearer Token，且能正确解析返回的 base64 并写入变体或返回前端。
- `.env.example` 中已列出 ModelGate 图像相关变量及说明。

---

## 需求三：环境变量汇总与 .env.example

### 目标

- 所有 ModelGate 相关配置通过环境变量暴露，便于不同环境（开发/预发/生产）统一管理。
- 与现有 `LLM_PROVIDER`、`RUN_MODE`、OpenAI、DeepSeek、Nano Banana 变量并列，不破坏已有逻辑；新增变量均带注释说明用途。

### 环境变量定义（建议）

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| **文字类（LLM）** | | | |
| `MODELGATE_API_KEY` | 选 modelgate 时必填 | - | ModelGate API Key，用于文字与（可选）图像；Bearer Token。 |
| `MODELGATE_BASE_URL` | 否 | `https://mg.aid.pub/v1` | ModelGate OpenAI 兼容端点，图二。 |
| `MODELGATE_MODEL` | 否 | 由实现定，如 `gpt-4` | 聊天模型名，如 gpt-4、claude-3-5-sonnet、gemini-pro 等。 |
| **图像类** | | | |
| `MODELGATE_IMAGE_API_KEY` | 否 | 回退 `MODELGATE_API_KEY` | 图像接口专用 Key；不设则用文字 Key。 |
| `MODELGATE_IMAGE_URL` | 否 | `https://mg.aid.pub/api/v1/images/generations` | 图像生成接口 URL，图一。 |
| `MODELGATE_IMAGE_MODEL` | 否 | `Nano-Banana` | 图像模型标识，图一。 |
| `MODELGATE_IMAGE_SIZE` | 否 | `1024x1024` | 生成尺寸。 |
| `MODELGATE_IMAGE_OUTPUT_FORMAT` | 否 | `png` | 输出格式。 |

- **`LLM_PROVIDER`** 扩展：可选值增加 `modelgate`，即 `auto | openai | deepseek | modelgate | local`；当为 `modelgate` 时，文字走 ModelGate，图像若启用且配置了 ModelGate 图像变量则走 ModelGate 图像 API。

### 迭代内容

1. **.env.example 更新**
   - 在现有 OpenAI、DeepSeek、Nano Banana 区块后增加「ModelGate」区块，按上表列出变量并注释用途与图一/图二对应关系。
   - 说明：文字类参考图二（base_url），图像类参考图一（images/generations）。

2. **文档**
   - 在 README 或内部文档中注明：ModelGate 为聚合商，官网 https://modelgate.net/models ；文字使用 https://mg.aid.pub/v1 ，图像使用 https://mg.aid.pub/api/v1/images/generations ；需在 ModelGate 控制台获取 API Key 并配置相应环境变量。

### 验收

- `.env.example` 中包含上述 ModelGate 相关变量及简短说明。
- 部署时仅需配置 `MODELGATE_API_KEY`（及可选 `MODELGATE_MODEL`、图像相关变量）即可使用 ModelGate 文字与图像能力。

---

## 需求四：前端与 API 的 Provider 选项

### 目标

- 用户可在前端选择「ModelGate」作为模型提供方，与现有 auto / openai / deepseek / local 并列。
- 服务端 `/api/generate` 与小红书文案生成 API 支持 provider=modelgate，并正确路由到 ModelGate 文字客户端。

### 迭代内容

1. **类型与常量**
   - `LlmProviderSelection` 增加 `"modelgate"`。
   - 前端 `PROVIDERS` 与 `PROVIDER_LABELS` 增加 `modelgate` 及显示名（如「ModelGate」）。

2. **API**
   - `/api/generate` 的 body 校验允许 `provider: "modelgate"`；`getPreferredProviderFromEnv()` 或等效逻辑支持从 `LLM_PROVIDER=modelgate` 读取默认 provider。
   - 小红书文案生成（若单独 API）在调用 LLM 时同样支持 modelgate provider。

3. **图像生成路由**
   - 当启用图像生成且使用 modelgate 时（或全局配置为优先 ModelGate 图像），调用 ModelGate 图像模块；否则保持现有 grsai/Nano Banana 逻辑，确保无配置时行为不变。

### 验收

- 前端下拉中可选「ModelGate」，提交后测评生成与文案生成走 ModelGate；若配置了图像变量且启用图像，则图像走 ModelGate 图像 API。
- 未配置 ModelGate 相关 env 时，选择 modelgate 应给出明确错误或回退提示，不静默失败。

---

## 实施顺序建议

| 顺序 | 需求 | 说明 |
|------|------|------|
| 1 | 需求三（环境变量定义 + .env.example） | 先约定变量名与默认值，便于后续实现与文档一致。 |
| 2 | 需求一（ModelGate 文字接入） | 新增 modelgate provider，读 MODELGATE_* 调用 https://mg.aid.pub/v1 。 |
| 3 | 需求四（前端与 API provider 选项） | 类型与 UI、API 校验支持 modelgate。 |
| 4 | 需求二（ModelGate 图像接入） | 新增图像模块，读 MODELGATE_IMAGE_* 调用 images/generations，与现有调用点衔接。 |

---

## 与现有能力的衔接

- **DeepSeek / OpenAI**：保留现有 provider 与环境变量；用户可继续选择 deepseek 或 openai，仅新增 modelgate 选项与对应 env。
- **Nano Banana（grsai）**：保留 `NANO_BANANA_*` 配置；当未配置 ModelGate 图像或显式使用原逻辑时，仍可走 grsai；推荐在配置了 ModelGate 图像后默认走 ModelGate 以降低成本与延迟。
- **RunMode**：`RUN_MODE=local` 下不调用 ModelGate；`RUN_MODE=api` 且 provider=modelgate 时使用 ModelGate 文字与（若配置）图像。
- **V5 能力**：小红书文案生成、material 两文件、敏感词、Prompt 分模块等不受影响；仅 LLM/图像调用后端由 DeepSeek/grsai 扩展为可选的 ModelGate。

---

## 参考链接与说明

- ModelGate 官网与模型列表：https://modelgate.net/models  
- 文字类（图二）：OpenAI 兼容，`base_url = https://mg.aid.pub/v1`，Bearer Token。  
- 图像类（图一）：`POST https://mg.aid.pub/api/v1/images/generations`，Body 含 model、prompt、size、output_type、output_format。

---

文档已按上述确认定稿，可直接按实施顺序开发。
