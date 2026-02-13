# TestFlow 迭代记录

## 2026-02-13 14:05:48 · Iteration 009 · 图像变体修复与辅助控件环境开关

### 本次需求
- 图像变体关闭时，必须过滤所有 `requiresImage=true` 的变体，且不触发图像 API。
- 调试面板与开关等非主流程控件需通过环境变量统一控制显示。

### 改动后
- 图像变体严格禁用（`app/api/generate/route.ts` + `lib/prompts.ts`）：
  - 当 `enableImageVariants=false` 时，不再调用 Nano Banana，且强制清空 `imagePrompt/imageAssets`。
  - 即使模型返回了 `imagePrompt`，也会在 `repairVariantPayload` 中被丢弃。
- 辅助控件环境开关（`NEXT_PUBLIC_SHOW_AUX_CONTROLS`）：
  - 默认 `true`，关闭后隐藏运行模式、图像变体、质量门控、调试面板等非主流程控件。
  - 文档写入 `.env.example` 说明。

### 影响评估
- 关闭图像变体后不会出现“非图像风格也调用图像 API”的异常。
- 主流程 UI 更干净，调试与开关可在需要时统一开启。

## 2026-02-13 12:45:54 · Iteration 007 · 质量门控开关化

### 本次需求
- 将质量门控相关逻辑改为可开关，便于先生成一版不受门控限制的效果进行对比测试。

### 改动后
- API 请求参数新增 `qualityGateEnabled`（`app/api/generate/route.ts`）。
- 当 `qualityGateEnabled=false` 时：
  - 跳过主题一致、题目去相似、选项区分度、结果差异等门控校验。
  - 不触发质量重写，直接使用模型结果（仍保留结构修复与安全后处理）。
  - 调试流新增 `quality-gate-skipped` 节点，便于在 Debug 面板确认。
- 首页右上角新增“质量门控 开/关”按钮（`app/page.tsx`），并将开关状态透传到 `/api/generate`。
- 当前默认值为 `关`，便于先做效果对比测试。

### 影响评估
- 你可在同一主题下快速对比“开门控”和“关门控”的内容差异，验证门控是否过严。
- 产品主体流程不变，调试能力仍保持独立悬浮面板承载。

## 2026-02-13 12:35:01 · Iteration 006 · 独立调试面板与全链路原始返回透出

### 本次需求
- 无论首页还是预览页，都要能直观看到每次 DeepSeek/模型返回的原始内容。
- 调试能力要抽离，不干扰产品主体功能，降低后续维护复杂度。

### 改动后
- 类型与协议（`types/index.ts`）：
  - 新增 `DebugEntry`。
  - SSE 事件新增 `status="debug"`。
  - `GeneratedTest` 新增 `debugTrace`。
- 后端链路调试透出（`app/api/generate/route.ts`）：
  - 在 LLM 请求开始、响应成功、质量重写、失败回退、图像生成等关键节点写入 `DebugEntry`。
  - 每条调试记录实时通过 SSE `debug` 事件推送到前端。
  - `done` 时将全量 `debugTrace` 一并回传并持久化。
- 独立调试组件（`components/debug-floating-panel.tsx`）：
  - 新增悬浮按钮 + 弹窗面板。
  - 左侧显示实时 debug trace，右侧显示每个变体的 `rawModelOutput`。
- 首页与预览接入（`app/page.tsx`, `app/preview/[testId]/page.tsx`）：
  - 首页可实时看请求过程中的模型原始返回。
  - 预览页可复盘本次测试的全链路调试信息与各变体原始文本。
- 主体界面解耦（`components/test-renderer.tsx`）：
  - 移除原先嵌在主内容卡片中的“AI原始返回”，统一由调试面板承载。

### 影响评估
- 调试能力从主业务 UI 抽离，功能更清晰，后续可单独开关维护。
- 你可直接区分“真实远程返回、重写返回、本地兜底”，定位失败原因更快。

## 2026-02-13 12:50:16 · Iteration 008 · Preview布局宽度优化

### 本次需求
- 保障 `preview` 页面中间手机预览区域宽度不被左右内容挤压。
- 左侧内容过长要自动换行不影响版面。

### 改动后
- `app/preview/[testId]/page.tsx`  grid 模板改为 `xl:grid-cols-[minmax(320px,0.9fr)_minmax(420px,1.2fr)_minmax(300px,0.9fr)]`，确保中间预览拥有最小约束宽度。
- 左栏容器加 `min-w-0`，避免宽内容强行撑开，且默认仍可换行。

### 影响评估
- 手机预览中心不再被变体列表压扁，且内容过长自动换行让布局稳定。

## 2026-02-13 12:21:58 · Iteration 005 · strictRemote开关与60秒超时

### 本次需求
- 开启严格远程模式：API 失败时不再回退本地模板。
- 默认超时从 30 秒提升到 60 秒，减少远程被动中断。

### 改动后
- 生成接口新增 `strictRemote` 参数（`app/api/generate/route.ts`）：
  - `strictRemote=true` 且 provider 是 `local` 时直接 400。
  - 远程 provider 不可用或远程重试失败时，直接抛错返回，不再 `local-fallback`。
- 文本生成超时改为 `60_000ms`（`app/api/generate/route.ts`）。
- 前端 API 模式默认发送 `strictRemote: true`（`app/page.tsx`），避免“表面API、实际兜底”误判。

### 影响评估
- 当远程接口波动时，用户会看到明确失败，而不是静默回退到模板题库。
- 成功请求的 AI 真实性更可验证，和 Preview 的原始返回卡片形成闭环。

## 2026-02-13 12:10:37 · Iteration 004 · A+B执行与Preview原始AI输出卡片

### 本次需求
- 先执行改造方案 `A + B`，暂不做 `C + D`。
- 增加“主题一致 + 内容不相似”约束，避免测评题目模板化复读。
- 在 `preview` 页面增加“AI返回原始内容”卡片，核验是否真实走AI生成。

### 改动后
- 类型扩展（`types/index.ts`）：
  - `TestVariant` 新增 `generationSource`、`rawModelOutput`。
- A方案落地（`lib/prompts.ts`）：
  - `buildUserPrompt` 新增质量反馈与“避免相似题目”上下文注入。
  - `repairVariantPayload` 增加 `fallbackMode`，API路径改为 `minimal` 最小兜底，降低固定题库覆盖。
- B方案落地（`app/api/generate/route.ts`）：
  - 增加质量门控：主题关联、题目去重、选项区分度、结果卡差异、跨变体去相似。
  - 质量不通过时带反馈重写（同一变体最多3次尝试），失败才回退本地模板。
  - 记录每个变体来源：`remote / remote-rewrite / local-fallback / local-mode`。
- Preview增强（`components/test-renderer.tsx`）：
  - 新增“AI原始返回”卡片，展示来源、provider 和原始文本内容。
- 本地模式标记（`lib/mock-test.ts`）：
  - 本地模板变体写入 `generationSource=local-mode` 与 mock 原始输出说明。

### 影响评估
- API路径不再默认被固定题库强覆盖，生成内容动态性增强。
- 你可以在预览页直接核验该变体是否真由AI产出，以及是否发生重写或回退。

## 2026-02-13 11:36:07 · Iteration 003 · Nano Banana 变体开关与数量联动

### 本次需求
- 新增 Nano Banana 相关变体开关，关闭后不使用任何依赖图像 API 的变体。
- 生成数量滑条与按钮按可用变体数动态收缩。
- 开关放在标题右上方，不占用主表单位置。

### 改动前
- 所有模式默认包含图像投射变体，无法快速关闭。
- 前端数量上限固定 5，无法反映可用变体变化。
- 后端未接收“禁用图像变体”参数，存在绕过风险。

### 改动后
- 前端首页（`app/page.tsx`）：
  - 标题右上新增“图像变体 开/关”开关（不占表单区）。
  - 关闭后数量上限由 `5` 自动降为 `4`，按钮与滑条同步联动。
  - API 请求与本地模式均带上 `enableImageVariants`。
- 后端生成 API（`app/api/generate/route.ts`）：
  - 请求参数新增 `enableImageVariants`。
  - 按当前开关校验最大可生成数量，超出返回 400。
  - 抽样策略接入 `allowImageStyles`，禁用图像风格时不再返回对应变体。
- 风格抽样（`lib/prompts.ts`）：
  - `sampleAssessmentStylesByPolicy` 新增 `allowImageStyles`。
  - 新增 `getAvailableStyleCount` 供服务端做数量上限校验。
- 本地模式（`lib/mock-test.ts`）：
  - `buildMockGeneratedTest` 支持 `enableImageVariants`，关闭时过滤 `image_projection` 变体。

### 影响评估
- 实现了“前端交互约束 + 后端硬约束”双保险。
- 不影响现有导出链路与 SSE 事件格式。

## 2026-02-13 11:22:14 · Iteration 002 · 严格风格策略与后处理完善

### 本次需求
- 继续完成 V2 后续关键项：特殊主题严格风格约束、概率语言去伪科学化、导出包带解构摘要。
- 迭代记录精度升级到时分秒，适应高频迭代。

### 改动前
- 风格抽样仅“推荐优先”，无法对特殊主题做强约束。
- 极端现实主题虽有免责声明，但未对“概率/生存率”等表达做统一降级。
- 导出 README 不包含主题解构信息。

### 改动后
- 抽样策略升级（`lib/prompts.ts`）：
  - 新增 `sampleAssessmentStylesByPolicy`，支持 `allowedStyleKeys` 强约束。
  - 支持允许风格不足时循环抽取，保证高 count 下仍可生成。
- 主题解构输出增强（`lib/topic-deconstruction.ts`, `types/index.ts`）：
  - 新增 `topicType`（fictional/extreme_real/abstract/general）。
  - `formConstraints` 新增 `allowedStyleKeys`，用于特殊主题硬约束。
  - 抽象主题自动加入“行动阶梯”注意项。
- 安全后处理增强（`app/api/generate/route.ts`）：
  - 极端现实主题自动把“生存率/成功率/概率”降级为“应对倾向/准备度/可能性”。
  - 结果描述统一附加特殊注意说明。
  - 抽象主题结果 CTA 自动追加行动阶梯（3步渐进路径）。
- 导出包增强（`lib/export.ts`）：
  - README 新增主题解构摘要（主题类型、测量目标、适配度、理论组合、风格建议、注意项）。
- 预览页增强（`components/test-renderer.tsx`）：
  - 增加主题类型与注意事项展示。

### 影响评估
- 更贴合 V2“特殊主题处理协议”，降低伪科学风险。
- 导出产物可追溯理论上下文，便于内容团队复盘。

### 记录规范
- 后续每次迭代均使用 `YYYY-MM-DD HH:mm:ss` 时间戳写入该文档。

## 2026-02-13 11:08:36 · Iteration 001 · V2主题解构引擎接入

### 本次需求
- 基于主线功能（输入主题 -> 抽卡变体 -> 可直接分发内容）引入 V2 的“主题解构引擎”。
- 将固定映射式生成升级为“先解构主题，再生成变体”的两层链路。
- 对极端虚构/极端现实主题增加安全约束，避免伪科学结论。
- 每次开发后沉淀可追踪的改动记录。

### 改动前
- 生成链路主要由固定风格模板 + LLM Prompt 驱动。
- 缺少结构化的主题分析数据（表面意象/深层构念/测量目标/置信度）。
- 风格抽样未显式参考主题分析。
- 预览页无法看到本次生成背后的理论适配信息。

### 改动后
- 新增 `lib/topic-deconstruction.ts`，实现 Topic Deconstruction Engine：
  - 输出 `deconstruction`、`theoryFramework`、`formConstraints`。
  - 覆盖主题分类（极端虚构/极端现实/抽象/通用）与理论工具箱动态组合。
  - 输出理论适配度、效度威胁、适用边界与特殊注意项。
- 扩展类型定义（`types/index.ts`）：
  - 新增 `TopicAnalysis` 及相关子结构类型。
  - `GeneratedTest` 新增 `topicAnalysis` 字段。
- 改造生成 API（`app/api/generate/route.ts`）：
  - 请求开始先构建 `topicAnalysis`。
  - 抽样变体时优先使用推荐风格。
  - 将解构结果注入 system/user prompt。
  - 生成后附加安全说明（特殊主题免责声明）。
  - `done` 事件返回完整 `topicAnalysis`。
- 改造 Prompt 层（`lib/prompts.ts`）：
  - 支持注入主题解构块到 Prompt。
  - 新增按推荐风格排序抽样 `sampleAssessmentStylesByRecommendation`。
- 本地模式同步（`lib/mock-test.ts`）：
  - 生成本地 mock 测试时同样携带 `topicAnalysis`。
- 预览页增强（`components/test-renderer.tsx`, `app/preview/[testId]/page.tsx`）：
  - 展示理论适配度、测量目标、理论组合，提升可解释性。

### 影响评估
- 不破坏现有 SSE 协议与导出链路，兼容历史 `GeneratedTest`（`topicAnalysis` 为可选字段）。
- 生成内容对复杂主题的解释一致性提升，且有明确安全边界。

### 后续建议
- 第二轮可将 `topicAnalysis` 同步写入导出包 `README.txt`，让分发产物也携带理论依据摘要。
- 第三轮可把“推荐风格”升级为“严格风格策略”（例如极端虚构主题仅允许图像投射/剧情型）。
