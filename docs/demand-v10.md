# TestFlow V10 能力层架构重构需求文档

## 项目背景与 V10 目标

### 当前问题

当前 testContent 项目存在以下结构性问题：

1. 业务逻辑分散在 API 和页面层，职责不清晰。
2. LLM 调用、Prompt 构建、内容生成逻辑耦合在 route 或 UI 层。
3. 无统一的服务层（Service Layer）抽象，无法被未来 Agent 复用。
4. 日志与错误处理缺乏统一规范。
5. API 结构未完全服务化，难以作为「能力平台」使用。

### V10 目标

V10 的核心目标：

> 将 testContent 升级为「能力层优先」的架构，形成稳定、可复用、可被 Agent 调用的 API 能力平台。

### 本次重构不包含

- ❌ 不实现 Agent 系统
- ❌ 不实现多副业中控
- ❌ 不新增业务功能
- ❌ 不重写 UI 设计

---

## API 与 Prompt 的耦合关系说明（重要）

### 原则：API 不与 Prompt 直接耦合

- **Route 层**：仅做参数校验、调用 Service、返回统一 JSON；**不得**在 route 中直接读取 `calendar.md`、拼接 prompt 或调用 `buildXxxPrompt`。
- **Service 层**：负责「按需调用 `lib/prompts` 构建 prompt」+「调用 `lib/llm/client`」+「解析结果」；所有与 prompt 相关的逻辑只存在于 Service 或 `lib/prompts`。
- **`lib/prompts`**：保留并延续为唯一的 prompt 构建来源；API 通过 Service 间接依赖 prompt，便于后续替换或扩展 prompt 而不影响 API 契约。

### 现有 API 与 Prompt 对应关系（重构后应保持的依赖方向）

| API | Prompt 来源 | 重构后职责归属 |
|-----|--------------|----------------|
| `POST /api/generate` | `lib/prompts`（buildSystemPrompt、buildUserPrompt、buildNanoBananaPrompt 等） | `generate-service.ts` 内调用上述方法，route 只调 Service |
| `POST /api/daily/generate` | `lib/prompts/daily.ts`（buildDailyPrompts，依赖 calendar.md + 热点） | `daily-service.ts` 内调用 buildDailyPrompts 与 LLM，route 只传 date/force 等参数 |
| `POST /api/xiaohongshu/generate` | `lib/prompts/xiaohongshu` | 若有对应 Service，则 prompt 构建仅在 Service + lib/prompts 内完成 |

### 验收要点（与 Prompt 相关）

- 所有「构建 prompt → 调用 LLM → 解析结果」的流程均在 Service 或 `lib/prompts` 内完成。
- 任意 route 文件中不得出现 `buildDailyPrompts`、`buildSystemPrompt`、`buildUserPrompt` 等 prompt 构建函数的直接调用；这些调用只允许出现在 `lib/services/*` 或 `lib/prompts/*` 中。
- 新增能力时：新增或复用 `lib/prompts` 下的函数，在对应 Service 中调用；API 仅透传参数与返回统一响应结构。

---

## 需求一：架构分层重构（核心）

### 目标

建立清晰的三层架构：

```
UI 层 → API 层 → Service 能力层
```

### 目标目录结构

```
/app
  /api
    /generate
    /export
    /daily
  /...

/lib
  /services
    generate-service.ts
    export-service.ts
    daily-service.ts
  /llm
    client.ts
  /prompts
  /utils
  /logger.ts
  (可选: storage.ts 或沿用现有封装)

/types
/data
```

### 重构原则

1. 所有业务逻辑必须移入 `/lib/services`。
2. API Route 仅负责：
   - 参数校验
   - 调用 Service
   - 返回统一 JSON（见需求二）。
3. 页面层不得包含业务逻辑。
4. LLM 调用统一走 `/lib/llm/client.ts`。
5. Prompt 构建仅发生在 Service 或 `lib/prompts`，API 不与 Prompt 直接耦合（见上文「API 与 Prompt 的耦合关系」）。

### Service 设计规范

示例：

```ts
// lib/services/daily-service.ts

export async function generateDailyContent(params: { date: string; force?: boolean }) {
  // 1. 在 service 内调用 lib/prompts 构建 prompt（不与 API 耦合）
  // 2. 调用 lib/llm/client
  // 3. 解析结果
  // 4. 通过 storage 写入
  // 5. 返回结构化数据
}
```

```ts
// lib/services/generate-service.ts

export async function generateTestContent(params: GenerateParams) {
  // 1. 构建 prompt（调用 lib/prompts）
  // 2. 调用 LLM
  // 3. 解析结果
  // 4. 返回结构化数据
}
```

### 验收

- 页面不再直接调用 LLM。
- API 不再包含复杂业务逻辑，且不直接调用 prompt 构建函数。
- 所有能力可被独立 `import` 调用（便于未来 Agent 复用）。

---

## 需求二：统一 API 响应结构

### 目标

所有 API 统一响应结构：

```ts
{
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
```

### 错误码规范

- 参数错误 → `INVALID_PARAMS`
- LLM 失败 → `LLM_ERROR`
- 文件/存储读写失败 → `STORAGE_ERROR`
- 未知错误 → `UNKNOWN_ERROR`

### 验收

- 所有 `/api/*` 路由统一返回上述格式。
- 不允许在 route 中直接 `return Response.json(原始业务对象)` 而不套在 `{ success, data, error }` 中。

---

## 需求三：统一日志系统

### 目标

建立 `/lib/logger.ts`。

### 日志接口

```ts
logger.info(message, meta?)
logger.error(message, meta?)
logger.warn(message, meta?)
```

### 规范

- 所有 Service 调用必须记录：
  - 开始时间（或入口日志）
  - 成功/失败
  - 执行耗时（建议在关键 Service 入口/出口打点）。
- 所有 API 层错误必须记录 `logger.error`。

### 验收

- 所有核心 Service 内存在 logger 调用。
- 不允许使用 `console.log` 作为正式日志（可保留仅用于本地临时调试，但交付前应移除或改为 logger）。

---

## 需求四：LLM 调用统一化

### 目标

所有模型调用必须通过：

```
lib/llm/client.ts
```

### 规范

1. 不允许在 service 或 route 中直接调用具体 provider（如直接 new 某 provider 或调用其方法）。
2. `client.ts` 负责：
   - 选择 provider（如基于 env 或参数）
   - 处理流式/非流式
   - 错误封装
   - 超时处理

### 验收

- 全项目仅有一个 LLM 调用入口（即通过 `lib/llm/client.ts`）。
- Provider 逻辑完全封装在 `lib/llm` 内，业务侧不直接依赖具体 provider 实现。

---

## 需求五：类型系统整理

### 目标

新增或整理：

```
/types/index.ts
```

### 必须类型

```ts
GenerateParams
GenerateResult
DailyContent
ApiResponse<T>
```

（可根据现有代码补充如 `ExportParams`、`ExportResult` 等。）

### 规范

- 所有 Service 的入参、返回值类型必须显式声明。
- 禁止在 Service 或 API 层使用 `any`（除非与第三方库类型兼容的极小范围，并加注释说明）。

### 验收

- 上述核心类型在 `types/index.ts` 中存在且被 API/Service 引用。
- 无未声明的业务对象类型（关键字段有类型定义）。

---

## 需求六：数据层封装

### 目标

文件存储必须封装到统一入口，例如：

```
lib/storage.ts
```

（若已有 `lib/daily-storage.ts` 等，可保留为领域封装，但底层读写应统一通过 `lib/storage.ts` 的 `readJSON` / `writeJSON` 等，避免在 API 或 Service 中直接使用 `fs.readFile`/`fs.writeFile`。）

### 方法

```ts
readJSON<T>(filePath: string): Promise<T>
writeJSON(filePath: string, data: unknown): Promise<void>
```

### 规范

- 不允许在 API 或 Service 中直接使用 `fs.readFile` / `fs.writeFile` 处理业务数据文件；所有 JSON 文件操作通过 storage 封装。
- 若已有 `lib/daily-storage.ts`，可内部调用 `lib/storage.ts` 的通用方法，保持「能力层只依赖 storage 抽象」。

### 验收

- 所有业务相关的 JSON 读写均通过 `lib/storage.ts` 或基于其封装的模块（如 daily-storage）完成。
- 无在 route 或 service 中直接 `require('fs')` 并读写业务文件的情况。

---

## 需求七：代码清理

### 目标

- 删除重复函数。
- 删除未使用文件。
- 删除或替换为 logger 的 `console.log`。
- 删除死代码（未引用分支、未使用变量等）。

### 验收

- 构建与 lint 通过。
- 无明显的重复实现（如同一逻辑在多处复制粘贴）。

---

## 需求八：Prettier 规范（延续 V9）

保持 V9 已定义的 Prettier 规范。如未存在则必须新增：

- `.prettierrc`（或 `.prettierrc.json`）
- `.prettierignore`
- `package.json` 中 `format` / `format:check` 脚本

### 验收

- 运行 `npm run format` 可正确格式化项目代码。

---

## 需求九：目录规范化与模板化（新增）

### 目标

将本项目重构后的目录作为后续「能力层项目」的标准模板，解决文件散落、职责混放、命名不一致问题，形成可复制的工程骨架。

### 标准模板目录（建议作为脚手架基线）

```txt
/app
  /api
    /generate
      route.ts
    /daily
      /content
        route.ts
      /generate
        route.ts
    /export
      route.ts
  /(pages-or-routes...)

/components
  (仅 UI 组件，不放业务编排)

/lib
  /services
    generate-service.ts
    daily-service.ts
    export-service.ts
  /llm
    client.ts
    /providers
  /prompts
    index.ts
    daily.ts
    xiaohongshu.ts
  /storage
    index.ts
    daily-storage.ts
  /utils
  logger.ts

/types
  index.ts

/data
  daily-content.json

/docs
  demand-v*.md
  iteration-log.md
```

### 文件归位规则（必须）

1. `app/api/**/route.ts`：仅保留「参数校验 + 调用 service + 响应包装」。
2. `lib/services/*-service.ts`：承载完整业务流程编排（prompt、llm、解析、存储、日志）。
3. `lib/prompts/*`：仅放 prompt 模板与构建函数，不放网络请求或文件写入。
4. `lib/llm/*`：仅放模型客户端与 provider 适配逻辑。
5. `lib/storage/*`：仅放文件/数据读写抽象，不放业务决策。
6. `components/*`：仅放展示与交互，不放跨页面业务逻辑。
7. `types/index.ts`：统一导出跨层复用类型，避免类型分散。

### 禁放清单（必须禁止）

- 在 `app/api/**` 中写 prompt 拼装、provider 调用、复杂业务分支。
- 在 `components/**` 中直接读写 `data/*.json` 或直接调用 LLM。
- 在 `lib/prompts/**` 中写 API/Service 业务分支。
- 在 `lib/services/**` 外散落同类业务函数（如 `lib/*.ts` 顶层临时业务文件长期保留）。

### 迁移清单（本次 V10 需在文档中可追踪）

- 将已有业务逻辑从 route/UI 迁移至 `lib/services/*-service.ts`。
- 将现有 `lib/daily-storage.ts` 对齐到 `lib/storage` 体系（可保留兼容导出，避免一次性破坏）。
- 将 prompt 相关能力集中在 `lib/prompts`，并由 service 统一调用。
- 新增能力时按模板落位：先建 service，再建 route，最后接 UI。
- 对历史散落文件建立「保留 / 合并 / 删除」标记清单，记录到 `iteration-log.md`。

### 命名规范（建议强制）

- Service 文件名：`<domain>-service.ts`
- Route 目录名：与能力域一致，如 `daily/generate`、`daily/content`
- Prompt 文件名：`<domain>.ts`，导出 `build<Domain>Prompts`
- 类型名：`<Domain>Params`、`<Domain>Result`、`ApiResponse<T>`

### 验收

- 项目目录满足模板分层，无新增散落业务文件。
- 任一能力都可按固定路径定位：`api -> service -> prompt/llm/storage -> types`。
- 随机抽查 3 个 API 路由，均不含业务编排代码。
- 后续新能力接入时，无需改变目录规则即可落地。

---

## 实施顺序建议

| 顺序 | 内容 |
|------|------|
| 1 | 建立 `lib/services` 层（先定义接口与文件，再迁逻辑） |
| 2 | 抽离业务逻辑（含 prompt 构建）到 Service，确保 API 与 Prompt 解耦 |
| 3 | 重构 API（参数校验 → 调 Service → 统一响应结构） |
| 4 | 统一 LLM 调用（确保仅通过 `lib/llm/client.ts`） |
| 5 | 引入 `lib/logger.ts` 并在核心 Service/API 使用 |
| 6 | 整理类型（`types/index.ts` 与 ApiResponse 等） |
| 7 | 数据层封装（`lib/storage.ts` 与现有 daily-storage 等对齐） |
| 8 | 代码清理（删除重复、未使用、console、死代码） |
| 9 | 目录规范化与模板化收口（完成文件归位、禁放检查、迁移清单） |

---

## 验收标准（必须全部满足）

- 页面层无业务逻辑。
- 所有 API 响应结构统一（success / data / error）。
- 所有 LLM 调用走 `lib/llm/client.ts`。
- 所有业务文件操作走 `lib/storage.ts` 或其封装。
- 所有核心 Service 有日志（logger），无正式使用 console.log。
- API 与 Prompt 不直接耦合（prompt 构建仅在 Service / lib/prompts）。
- TypeScript 关键路径无 `any`。
- 目录结构满足模板化约束，关键文件落位一致且可复用到后续项目。
- 项目可正常运行，主流程可跑通。

---

## 与未来 Agent 的衔接说明

V10 完成后：

- 所有能力可通过 HTTP API 调用。
- 所有能力可直接通过 `import` 对应 Service 调用。
- 已具备被 Agent 托管的基础条件；Agent 只需调 Service 或 API，无需关心 prompt 与 LLM 实现细节。

V10 不实现 Agent 本身。

---

## iteration-log.md 更新规范（必须执行）

开发完成后，在 `iteration-log.md` 文件**顶部**（倒序）插入以下内容：

```markdown
## [YYYY-MM-DD] — V10 能力层架构重构

### 🚀 本次目标
能力层重构，建立 Service 架构，API 与 Prompt 解耦。

### 🧠 工作内容
（列出重构点，如：generate-service、daily-service、统一响应、logger、storage、类型整理等）

### ✅ 已完成
（列出验收标准及对应完成情况）

### ❌ 遗留问题
（如有）

### 📝 测试结果
（测试通过情况）
```

必须倒序插入，不得追加到文件底部。

---

## 名词与数据约定

| 名称 | 说明 |
|------|------|
| 能力层 | 指 `lib/services` 中可被 API 或 Agent 直接调用的业务能力封装。 |
| Service | 单文件或单模块，负责某一类能力（如生成、导出、每日推荐）的完整流程，含 prompt 构建、LLM 调用、解析、存储等。 |
| API 与 Prompt 解耦 | Route 不直接调用 prompt 构建函数或读取 prompt 文件；仅 Service 或 `lib/prompts` 负责 prompt 构建。 |
| 统一响应 | 所有 API 返回 `{ success, data?, error? }`，错误码见需求二。 |

---

## 重要提示

本次重构属于结构性改造：

1. 必须在理解现有代码后再抽离，尤其注意现有 API 与 `lib/prompts` 的调用关系，避免破坏每日推荐、生成、导出等流程。
2. 不允许破坏现有功能；重构后行为应与重构前一致（仅结构调整与统一响应/日志等）。
3. 必须完整测试（含每日推荐、内容生成、导出等主流程）。
4. 所有迭代需保证主流程可运行；若分阶段提交，每一阶段都应是可运行状态。

文档已按上述确认定稿，可直接按实施顺序开发。
