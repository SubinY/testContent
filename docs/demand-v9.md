# TestFlow V9 每日推荐内容组件需求文档

## 项目背景与 V9 目标

### 当前问题

当前系统缺少一个**每日推荐功能**，无法让用户基于日期查看或生成与当日相关的心理测试主题内容。用户无法通过时间维度探索心理测试，也无法基于过往重要时刻的情绪共鸣来获取测试灵感。

### V9 目标

V9 的目标是**新增一个每日推荐内容组件**，该组件能够：

1. **极简展示**：在页面左上方悬浮显示当天推荐的极简内容（简短主题文字）。
2. **详情查看**：点击悬浮卡片后，弹出详情浮窗显示完整的推荐内容方向。
3. **智能内容生成**：根据过往各种重要时刻的情绪产生共鸣主题，参考 `calendar.md` 中的 prompt 模板，结合实时热点、历史事件、节假日等信息生成心理测试主题。
4. **内容持久化**：每次生成的内容保存到 JSON 文件，下次打开时能查看历史日子的内容。
5. **按需生成**：在页面首次加载时，检查当天是否已有内容，如果没有则异步生成（显示 loading 状态），避免重复生成。

**核心诉求**：

1. **悬浮卡片组件**：左上方固定位置显示当天推荐的极简内容，点击后弹出详情浮窗。
2. **内容生成时机**：页面首次加载时，检查当天内容是否存在；不存在则异步生成，存在则直接展示。
3. **内容展示**：悬浮卡片显示简短主题文字（如「情绪管理：面对压力时的反应」），点击后弹出详情浮窗显示完整主题内容方向。
4. **数据持久化**：所有生成内容保存到 `data/daily-content.json`，格式为按日期索引的 JSON 对象。
5. **前端技能调用**：使用项目已有的前端设计 skill（frontend-design、frontend-ui-ux、ui-ux-pro-max、web-component-design、vercel-react-best-practices、web-artifacts-builder）完成组件开发。
6. **代码格式化**：新增社区通用的 Prettier 配置文件，用于统一代码格式化。

---

## 需求一：每日推荐悬浮卡片 UI 实现

### 目标

- 在页面左上方添加**悬浮卡片**，直接显示当天推荐的极简内容（简短主题文字）。
- 点击悬浮卡片后，弹出详情浮窗显示完整的推荐内容方向。
- 悬浮卡片样式极简，不干扰主页面内容。

### 迭代内容

> **提示**：以下迭代内容仅供参考，具体修改需要依赖实际代码检查（vibe coding）自行确定要改动的地方。

1. **悬浮卡片组件**（`components/daily-recommendation-card.tsx`）：
   - 位置：页面左上方（fixed 定位，z-index 较高，如 `top-4 left-4`）。
   - 样式：
     - 极简卡片设计，圆角矩形（2xl 圆角），轻阴影。
     - 背景色使用项目主题色或浅色背景（如 `bg-white/90` 或 `bg-slate-50`）。
     - 内边距适中（如 `p-3` 或 `p-4`）。
     - 宽度适中（如 `max-w-xs`），不遮挡主要内容。
   - 内容：
     - 显示简短主题文字（`shortTheme`，8-10 字），超出省略。
     - 可显示日期标识（如「今日推荐」或日期）。
     - Loading 状态：生成中显示骨架屏或 spinner。
   - 交互：
     - Hover 效果：轻微阴影变化或背景色变化。
     - 点击后打开详情浮窗（通过状态控制显示/隐藏）。
     - 支持点击外部区域关闭详情浮窗。

2. **详情浮窗组件**（`components/daily-recommendation-detail.tsx`）：
   - 触发：点击悬浮卡片。
   - 布局：居中浮窗（modal/dialog），背景遮罩，支持点击遮罩关闭。
   - 内容区域：
     - 顶部：日期标题（如「2026-02-19 今日推荐」）。
     - 主体：完整主题内容方向（从 JSON 数据中读取 `fullContent` 字段），支持 Markdown 渲染。
     - 底部：关闭按钮或提示文字。
   - 样式：
     - 遵循项目设计规范（极简、大留白、2xl 圆角、轻阴影）。
     - 响应式：移动端适配，浮窗宽度自适应。
     - 内容区域可滚动（如内容较长）。

3. **样式与动效**：
   - 使用 TailwindCSS 实现样式，遵循项目现有设计规范。
   - 使用 Framer Motion 实现浮窗打开/关闭动画。
   - 悬浮卡片 hover 效果、点击反馈。

### 验收

- 左上方悬浮卡片可见，显示当天推荐的极简内容。
- 点击悬浮卡片后，详情浮窗正常打开/关闭。
- 详情浮窗正确显示完整的推荐内容。
- 移动端响应式布局正常，交互流畅。

---

## 需求二：内容生成 API 与逻辑

### 目标

- 创建 `/api/daily/generate` API 端点，接收日期参数，调用 LLM 生成心理测试主题内容。
- 生成逻辑参考 `calendar.md` 中的 prompt 模板，结合实时热点、历史事件、节假日等信息。
- 生成内容包括：简短主题文字（用于悬浮卡片展示）和完整主题内容方向（用于详情展示）。

### 迭代内容

> **提示**：以下迭代内容仅供参考，具体修改需要依赖实际代码检查（vibe coding）自行确定要改动的地方。

1. **API 端点**（`app/api/daily/generate/route.ts`）：
   - 方法：`POST`。
   - 请求体：
     ```typescript
     {
       date: string; // YYYY-MM-DD 格式，如 "2026-02-19"
     }
     ```
   - 逻辑：
     - 读取 `calendar.md` 中的 prompt 模板，将 `{current_date}` 替换为请求的日期。
     - 调用 LLM（使用项目现有的 provider 体系，如 ModelGate、DeepSeek 等）。
     - 解析 LLM 返回内容，提取：
       - `shortTheme`：简短主题文字（8-10 字，用于悬浮卡片展示）。
       - `fullContent`：完整主题内容方向（包含问题、选项、解释等，用于详情展示）。
     - 将生成内容保存到 `data/daily-content.json`（见需求三）。
     - 返回 JSON：
       ```typescript
       {
         date: string;
         shortTheme: string;
         fullContent: string;
         generatedAt: string; // ISO 8601 格式
       }
       ```

2. **Prompt 模板处理**：
   - 在 `lib/prompts/daily.ts` 中定义 prompt 构建函数。
   - 读取 `calendar.md` 内容或直接内嵌 prompt 模板。
   - 将 `{current_date}` 替换为实际日期。
   - 返回完整的 system prompt 和 user prompt。

3. **LLM 调用**：
   - 使用项目现有的 `lib/llm/client.ts` 和 provider 体系。
   - 支持流式或非流式生成（建议非流式，因为内容较短）。
   - 错误处理：生成失败时返回错误信息，前端显示提示。

4. **内容解析**：
   - LLM 返回内容可能是 Markdown 格式，需要解析提取 `shortTheme` 和 `fullContent`。
   - 建议要求 LLM 返回 JSON 格式，便于解析：
     ```json
     {
       "shortTheme": "情绪管理：面对压力时的反应",
       "fullContent": "## 主题：情绪管理：面对压力时的反应\n\n### 问题：\n...\n### 选项：\n...\n### 解释：\n..."
     }
     ```

### 验收

- 调用 `/api/daily/generate` 并传入日期，能正确生成主题内容。
- 生成内容包含 `shortTheme` 和 `fullContent` 字段。
- 生成失败时返回明确的错误信息。

---

## 需求三：数据持久化与读取

### 目标

- 所有生成内容保存到 `data/daily-content.json` 文件。
- 前端能够读取当天内容，在悬浮卡片中展示。
- 支持按日期查询、更新、新增内容。

### 迭代内容

> **提示**：以下迭代内容仅供参考，具体修改需要依赖实际代码检查（vibe coding）自行确定要改动的地方。

1. **数据文件结构**（`data/daily-content.json`）：
   ```json
   {
     "2026-02-19": {
       "date": "2026-02-19",
       "shortTheme": "情绪管理：面对压力时的反应",
       "fullContent": "## 主题：情绪管理：面对压力时的反应\n\n### 问题：\n...",
       "generatedAt": "2026-02-19T10:30:00.000Z"
     },
     "2026-02-20": {
       "date": "2026-02-20",
       "shortTheme": "关系动态：处理人际冲突的方式",
       "fullContent": "## 主题：关系动态：处理人际冲突的方式\n\n...",
       "generatedAt": "2026-02-20T09:15:00.000Z"
     }
   }
   ```
   - 键为日期字符串（YYYY-MM-DD），值为该日期的内容对象。

2. **服务端读取/写入工具**（`lib/daily-storage.ts`）：
   - `readDailyContent(date?: string)`: 读取指定日期内容，或读取全部内容。
   - `writeDailyContent(date: string, content: DailyContent)`: 写入或更新指定日期内容。
   - `checkContentExists(date: string)`: 检查指定日期是否已有内容。
   - 文件操作使用 Node.js `fs` 模块，注意错误处理（文件不存在时创建空对象）。

3. **API 端点扩展**：
   - `GET /api/daily/content?date=2026-02-19`: 读取指定日期内容。
   - `GET /api/daily/content`: 读取当天内容（用于前端初始化悬浮卡片）。
   - `POST /api/daily/generate`: 生成并保存内容（见需求二）。

4. **前端数据获取**：
   - 在页面首次加载时，调用 `GET /api/daily/content` 获取当天内容。
   - 如果存在内容，在悬浮卡片中显示 `shortTheme`。
   - 点击悬浮卡片时，从已获取的数据中读取 `fullContent`，无需再次请求。

### 验收

- 生成内容后，`data/daily-content.json` 文件正确更新。
- 前端页面加载时，能正确读取并展示当天内容。
- 点击悬浮卡片时，详情浮窗显示正确的完整内容。

---

## 需求四：内容生成时机与交互流程

### 目标

- 在页面首次加载时，检查当天是否已有内容。
- 如果没有，则异步生成（显示 loading 状态），生成完成后更新悬浮卡片显示。
- 如果有，则直接展示，无需生成。

### 迭代内容

> **提示**：以下迭代内容仅供参考，具体修改需要依赖实际代码检查（vibe coding）自行确定要改动的地方。

1. **前端逻辑**（`components/daily-recommendation-card.tsx`）：
   - 页面首次加载时（使用 `useEffect`）：
     - 调用 `GET /api/daily/content` 获取当天内容。
     - 检查返回数据中是否包含当天日期（`new Date().toISOString().split('T')[0]`）的内容。
     - 如果不存在：
       - 显示悬浮卡片的 loading 状态（如骨架屏或 spinner）。
       - 调用 `POST /api/daily/generate` 生成当天内容（传入当天日期）。
       - 生成成功后，更新本地状态，移除 loading，显示生成的主题文字。
     - 如果存在：
       - 直接显示当天内容的 `shortTheme`，无需生成。

2. **用户主动生成**（可选）：
   - 在详情浮窗中，如果当天没有内容或生成失败，显示「重新生成」按钮。
   - 点击后触发生成，显示 loading，生成完成后更新显示。

3. **错误处理**：
   - 生成失败时，在悬浮卡片中显示错误提示（如「生成失败，请稍后重试」）。
   - 允许用户手动重试（点击悬浮卡片或详情浮窗中的重试按钮）。

4. **性能优化**：
   - 当天内容仅在页面首次加载时获取一次，避免频繁请求。
   - 生成内容时使用乐观更新，先显示 loading，生成完成后更新。
   - 悬浮卡片使用轻量级设计，不影响页面性能。

### 验收

- 页面首次加载时，如果当天没有内容，自动触发生成并显示 loading。
- 生成完成后，悬浮卡片正确显示主题文字。
- 如果当天已有内容，直接展示，无延迟。
- 点击悬浮卡片后，详情浮窗正确显示完整内容。

---

## 需求五：Prettier 配置文件

### 目标

- 新增社区通用的 Prettier 配置文件，用于统一代码格式化。
- 配置符合 Next.js + TypeScript + TailwindCSS 项目的最佳实践。

### 迭代内容

1. **配置文件**（`.prettierrc` 或 `.prettierrc.json`）：
   ```json
   {
     "semi": true,
     "trailingComma": "es5",
     "singleQuote": false,
     "printWidth": 100,
     "tabWidth": 2,
     "useTabs": false,
     "arrowParens": "always",
     "endOfLine": "lf"
   }
   ```

2. **忽略文件**（`.prettierignore`）：
   ```
   node_modules
   .next
   out
   dist
   build
   *.min.js
   *.min.css
   package-lock.json
   ```

3. **package.json 脚本**：
   - 添加格式化脚本：
     ```json
     "scripts": {
       "format": "prettier --write .",
       "format:check": "prettier --check ."
     }
     ```

4. **安装 Prettier**（如未安装）：
   ```bash
   npm install --save-dev prettier
   ```

### 验收

- 运行 `npm run format` 能正确格式化项目代码。
- 配置文件符合社区通用规范。

---

## 实施顺序建议

| 顺序 | 需求 | 说明 |
|------|------|------|
| 1 | 需求五（Prettier 配置） | 先配置代码格式化工具，确保后续代码风格统一。 |
| 2 | 需求三（数据持久化） | 先实现数据存储与读取能力，为内容生成和展示提供基础。 |
| 3 | 需求二（内容生成 API） | 实现内容生成逻辑，确保能根据日期生成主题内容。 |
| 4 | 需求一（每日推荐悬浮卡片 UI） | 实现前端 UI 组件，包括悬浮卡片、详情浮窗。 |
| 5 | 需求四（生成时机与交互） | 整合前端与后端，实现完整的交互流程。 |

---

## 与现有能力的衔接

- **LLM Provider 体系**：内容生成使用项目现有的 `lib/llm/client.ts` 和 provider 体系（ModelGate、DeepSeek 等），无需新增 provider。
- **设计规范**：每日推荐组件遵循项目现有的 UI/UX 设计规范（极简、大留白、2xl 圆角、轻阴影），使用 TailwindCSS 和 Framer Motion。
- **前端技能**：使用项目已有的前端设计 skill（frontend-design、frontend-ui-ux、ui-ux-pro-max、web-component-design、vercel-react-best-practices、web-artifacts-builder）完成组件开发。
- **数据存储**：使用文件系统存储（`data/daily-content.json`），与项目现有的零后端数据库原则一致（可静态部署）。
- **类型定义**：在 `types/index.ts` 中新增每日推荐相关类型定义，与现有类型体系保持一致。

---

## 名词与数据约定

| 名称 | 说明 |
|------|------|
| 每日推荐组件 | 包含悬浮卡片、详情浮窗的完整 UI 组件集合。 |
| 悬浮卡片 | 页面左上方固定位置的极简卡片，显示当天推荐的简短主题文字。 |
| 简短主题文字 | 用于悬浮卡片中显示的主题文字，长度 8-10 字，超出省略。 |
| 完整主题内容方向 | 用于详情浮窗中显示的完整内容，包含问题、选项、解释等。 |
| `daily-content.json` | 存储所有生成内容的 JSON 文件，键为日期（YYYY-MM-DD），值为内容对象。 |
| 内容生成时机 | 页面首次加载时，检查当天是否已有内容；没有则异步生成，有则直接展示。 |
| `DailyContent` | 单个日期的内容对象类型，包含 `date`、`shortTheme`、`fullContent`、`generatedAt` 字段。 |

---

## 重要提示

**迭代内容仅供参考**：本文档中所有"迭代内容"部分提供的文件路径、函数名、代码片段等均为参考建议，具体修改时需要：

1. **依赖实际代码检查**：使用 vibe coding 或代码审查工具，自行检查实际代码结构，确定需要改动的具体位置。
2. **理解业务逻辑**：在修改前充分理解现有代码的业务逻辑，确保每日推荐组件不影响其他功能。
3. **测试验证**：修改后需要充分测试各种场景（首次加载、已有内容、生成失败、点击交互等），确保行为符合预期。
4. **Prompt 模板**：内容生成逻辑需严格参考 `calendar.md` 中的 prompt 模板，确保生成内容贴合中国国内娱乐新闻热点、历史事件、节假日等。

文档已按上述确认定稿，可直接按实施顺序开发。

