# TestFlow 迭代记录

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
