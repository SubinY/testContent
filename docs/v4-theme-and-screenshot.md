# V4 风格模板与截图策略说明

## 风格模板

- 主题定义位于 `lib/themes.ts`。
- `THEME_PRESETS` 是主题列表，结构包含 `id`、`name`、`description`、`tokens`。
- `buildStandaloneHtml` 与 `generateSlideScreenshots` 都通过 `themeId` 调用 `getThemeById`，共享同一套 token。

## 如何新增风格

1. 在 `lib/themes.ts` 的 `THEME_PRESETS` 中新增一个主题对象。
2. 填写完整 `tokens`（颜色、字体、圆角、阴影、截图背景）。
3. 无需修改 `TestVariant`、题目渲染逻辑、导出 ZIP 主流程。

## 截图“看全”策略

- 截图接口：`generateSlideScreenshots(variant, { themeId, fullContent })`。
- 当前默认 `fullContent: true`：
  - 宽度固定 `1080`。
  - 每页最小高度 `1440`。
  - 当内容超出时自动增高画布，避免封面、题目选项、结果文案被裁切。
- 导出 ZIP 的 `README.txt` 会记录当前风格和截图策略。
