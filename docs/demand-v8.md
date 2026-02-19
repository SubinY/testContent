# TestFlow V8 部分变体失败容错与预览统计需求文档

## 项目背景与 V8 目标

### 当前问题

当前生成多套变体时，变体采用**顺序同步生成**（sequential synchronous）方式：使用 `for` 循环 + `await` 逐个生成变体。如果某个变体生成失败（如远程 API 错误、质量门控三次重试后仍失败、`strictRemote` 模式下远程不可用等），`createVariantWithProvider` 会抛出异常，被外层的 `try-catch` 捕获，导致**整个生成流程中断**，不会继续生成其他变体，直接返回错误。

### V8 目标

V8 的目标是**实现部分成功容错**：变体仍然是**顺序同步生成**的，但每一套变体无论成功还是失败（包括质量门控三次重试后仍失败），都不应该影响下一步动作，直到所有变体都处理完毕。只要有一个或多个变体成功生成，就应该在最终的 preview 页面显示成功的变体，失败的不显示，并在页面最上方提示成功/失败统计。如果一套都不成功，则保持现状——直接在首页 SSE 输出生成失败。

**核心诉求**：

1. **容错生成**：变体同步顺序生成，每个变体的生成失败（包括三次重试后失败）不应中断其他变体的生成流程，所有变体处理完毕后再判断最终结果。
2. **成功优先**：只要有一个或多个变体成功，就进入 preview 页面展示成功的变体。
3. **失败统计**：在 preview 页面最上方显示成功生成多少套变体、失败多少套。
4. **全失败保持现状**：如果所有变体都失败，则在首页 SSE 输出 error 事件，不跳转 preview。

---

## 需求一：生成 API 容错改造

### 目标

- **核心改动**：在变体生成循环内添加独立的 try-catch，将每个变体的生成逻辑包裹起来，单个变体失败不影响其他变体继续生成。
- 收集成功和失败的变体，在最终结果中区分。

### 当前代码问题

当前代码在 `app/api/generate/route.ts` 的 565-619 行使用 `for` 循环顺序生成变体，但 `createVariantWithProvider` 的异常会被外层 `try-catch`（644 行）捕获，导致整个流程中断。**需要在循环内添加 try-catch，而不是依赖外层 try-catch**。

### 迭代内容

> **提示**：以下迭代内容仅供参考，具体修改需要依赖实际代码检查（vibe coding）自行确定要改动的地方。

1. **变体生成循环改造**（`app/api/generate/route.ts`，约 565-619 行）：
   - **关键改动**：在 `for (let index = 0; index < totalVariants; index += 1)` 循环内，将 `createVariantWithProvider` 调用包裹在**独立的 try-catch** 中。
   - **重要原则**：无论变体成功还是失败（包括质量门控三次重试后仍失败、`strictRemote` 模式下远程失败等），都不应该影响循环继续执行下一个变体，直到所有变体都处理完毕。
   - 成功时：将变体加入 `variants` 数组，并发送 `variant` SSE 事件。
   - 失败时：记录失败信息（变体 label、styleName、错误消息、时间戳）到 `failures` 数组，发送 `progress` SSE 事件提示该变体失败，**继续下一个变体**（不中断循环，不抛出异常）。
   - 循环结束后，统计成功数量（`variants.length`）与失败数量（`failures.length`）。

2. **失败信息记录**：
   - 新增类型 `VariantGenerationFailure`（或直接在 `GeneratedTest` 中增加字段）：
     ```typescript
     interface VariantGenerationFailure {
       label: string;
       styleName?: string;
       error: string;
       attemptAt: string;
     }
     ```
   - 在 `GeneratedTest` 类型中新增可选字段：
     - `successCount: number`：成功生成的变体数量。
     - `failureCount: number`：失败的变体数量。
     - `failures?: VariantGenerationFailure[]`：失败详情数组（可选，用于调试）。

3. **最终结果判断**（循环结束后，约 619 行之后）：
   - 如果 `variants.length === 0`（所有变体都失败）：
     - 发送 `error` SSE 事件，消息如「所有变体生成失败，请检查配置或稍后重试。」
     - 不发送 `done` 事件，不跳转 preview。
     - 外层 `try-catch` 会捕获并处理该错误事件。
   - 如果 `variants.length > 0`（至少一个成功）：
     - 发送 `done` SSE 事件，`test.variants` 仅包含成功的变体。
     - `test.successCount = variants.length` 和 `test.failureCount = failures.length` 写入最终结果。
     - `test.failures = failures`（可选，用于调试）。
     - 前端正常跳转 preview。

4. **SSE 事件增强**：
   - 在变体失败时，发送 `progress` 事件，消息如「变体 A（第一眼图像投射型）生成失败：{错误原因}，继续生成其他变体...」
   - 在循环结束后，发送 `progress` 事件，消息如「生成完成：成功 3 个，失败 1 个。」

### 验收

- 生成 5 个变体时，如果第 2 个失败，其他 4 个仍能正常生成并进入 preview。
- 如果全部失败，首页显示错误提示，不跳转 preview。
- SSE 事件流中能清晰看到每个变体的成功/失败状态。

---

## 需求二：类型定义扩展

### 目标

- 在 `types/index.ts` 中新增失败信息类型，并在 `GeneratedTest` 中增加成功/失败统计字段。

### 迭代内容

> **提示**：以下迭代内容仅供参考，具体修改需要依赖实际代码检查（vibe coding）自行确定要改动的地方。

1. **新增失败信息类型**：
   ```typescript
   export interface VariantGenerationFailure {
     label: string;
     styleName?: string;
     error: string;
     attemptAt: string;
   }
   ```

2. **扩展 `GeneratedTest`**：
   ```typescript
   export interface GeneratedTest {
     id: string;
     topic: string;
     createdAt: string;
     topicAnalysis?: TopicAnalysis;
     debugTrace?: DebugEntry[];
     variants: TestVariant[];
     // V8 新增
     successCount?: number;  // 成功生成的变体数量
     failureCount?: number;   // 失败的变体数量
     failures?: VariantGenerationFailure[];  // 失败详情（可选，用于调试）
   }
   ```

3. **向后兼容**：
   - `successCount`、`failureCount`、`failures` 均为可选字段，历史数据不受影响。
   - 前端判断时使用 `successCount ?? variants.length` 作为默认值。

### 验收

- 类型定义编译通过，无类型错误。
- 历史 `GeneratedTest` 数据可正常读取（可选字段缺失不影响）。

---

## 需求三：Preview 页面统计展示

### 目标

- 在 preview 页面最上方（标题区域或独立横幅）显示成功/失败统计信息。
- 仅当存在失败变体时显示统计横幅；全部成功时不显示或显示简化提示。

### 迭代内容

> **提示**：以下迭代内容仅供参考，具体修改需要依赖实际代码检查（vibe coding）自行确定要改动的地方。

1. **统计横幅组件**（`app/preview/[testId]/page.tsx`）：
   - 在页面最上方（`<main>` 内第一层）新增统计横幅区域。
   - 条件渲染：仅当 `mountedTest.failureCount > 0` 时显示。
   - 显示内容：
     - 成功数量：`✅ 成功生成 ${mountedTest.successCount ?? mountedTest.variants.length} 套变体`
     - 失败数量：`❌ 失败 ${mountedTest.failureCount} 套变体`
     - 可选：展开/收起失败详情（显示 `failures` 数组中的 label 和错误消息）。

2. **样式设计**：
   - 使用 `card-surface` 或独立横幅样式，背景色可用 `amber-50` 或 `slate-50`，边框 `amber-200`。
   - 文字大小适中（`text-sm`），图标与文字对齐。
   - 失败详情可折叠，默认收起，点击展开显示具体失败变体的 label 和错误。

3. **布局位置**：
   - 统计横幅位于 `<main className="page-wrap">` 内第一层，在 grid 布局之前。
   - 确保不影响现有三栏布局（变体列表、手机预览、导出面板）。

### 验收

- 全部成功时，不显示统计横幅（或显示简化提示「全部变体生成成功」）。
- 部分失败时，横幅清晰显示成功/失败数量，失败详情可展开查看。
- 横幅样式与整体设计风格一致，不突兀。

---

## 需求四：首页 SSE 错误处理保持现状

### 目标

- 当所有变体都失败时，保持现有行为：在首页显示错误提示，不跳转 preview。

### 迭代内容

> **提示**：以下迭代内容仅供参考，具体修改需要依赖实际代码检查（vibe coding）自行确定要改动的地方。

1. **错误事件处理**（`app/page.tsx`）：
   - 当收到 `status: "error"` 的 SSE 事件时，保持现有逻辑：
     - `setErrorText(eventData.message)`
     - `setGenerating(false)`
     - `setProgress(0, "生成已中断。")`
     - 不调用 `router.push`，停留在首页。

2. **错误消息优化**：
   - 后端在全部失败时，错误消息应包含失败原因摘要，如「所有变体生成失败：远程 API 不可用，请检查配置或稍后重试。」

### 验收

- 全部失败时，首页显示错误提示，不跳转。
- 错误消息清晰，便于用户理解失败原因。

---

## 实施顺序建议

| 顺序 | 需求 | 说明 |
|------|------|------|
| 1 | 需求二（类型定义） | 先扩展类型，确保类型系统支持新增字段。 |
| 2 | 需求一（API 容错） | 改造生成 API，实现容错逻辑与统计收集。 |
| 3 | 需求三（Preview 统计） | 在 preview 页面添加统计横幅展示。 |
| 4 | 需求四（首页错误处理） | 验证全部失败时的错误处理（通常无需改动，保持现状即可）。 |

---

## 与现有能力的衔接

- **质量门控与重写**：单个变体的质量门控失败（3 次重写都失败）会抛出异常，被循环内的 try-catch 捕获，视为该变体失败，不影响其他变体继续生成。
- **strictRemote 模式**：如果 `strictRemote=true` 且远程失败，`createVariantWithProvider` 会抛出异常（约 428-430 行），被循环内的 try-catch 捕获，该变体视为失败，不影响其他变体。
- **图像生成失败**：图像生成失败已在 `createVariantWithProvider` 内部处理（约 283-295 行），不会抛出异常，不影响文本变体的成功状态（变体仍可显示，只是没有图像）。
- **本地回退**：如果允许本地回退，回退成功视为成功；如果 `strictRemote=true` 且远程失败，该变体视为失败。
- **调试面板**：失败的变体不会出现在 `variants` 数组中，但相关的 `debugTrace` 仍会记录失败过程的调试信息（在失败前已通过 `pushDebug` 记录）。
- **导出功能**：导出时仅包含成功的变体（`variants` 数组），失败的不包含在导出包中。

---

## 名词与数据约定

| 名称 | 说明 |
|------|------|
| 顺序同步生成 | 使用 `for` 循环 + `await` 逐个生成变体，不是并行生成。 |
| 成功变体 | 通过 `createVariantWithProvider` 成功返回的 `TestVariant`，加入 `variants` 数组。 |
| 失败变体 | `createVariantWithProvider` 抛出异常（被循环内 try-catch 捕获）的变体，记录到 `failures` 数组，不加入 `variants`。 |
| `successCount` | 成功生成的变体数量，等于 `variants.length`。 |
| `failureCount` | 失败的变体数量，等于 `failures.length`。 |
| 全部失败 | `variants.length === 0`（即 `successCount === 0`），此时发送 `error` SSE 事件，不跳转 preview。 |
| 部分成功 | `variants.length > 0 && failures.length > 0`（即 `successCount > 0 && failureCount > 0`），此时跳转 preview，显示成功变体与统计横幅。 |

---

## 重要提示

**迭代内容仅供参考**：本文档中所有"迭代内容"部分提供的文件路径、函数名、代码片段等均为参考建议，具体修改时需要：

1. **依赖实际代码检查**：使用 vibe coding 或代码审查工具，自行检查实际代码结构，确定需要改动的具体位置。
2. **理解业务逻辑**：在修改前充分理解现有代码的业务逻辑，确保容错改造不影响其他功能。
3. **测试验证**：修改后需要充分测试各种场景（全部成功、部分成功、全部失败），确保行为符合预期。

文档已按上述确认定稿，可直接按实施顺序开发。

