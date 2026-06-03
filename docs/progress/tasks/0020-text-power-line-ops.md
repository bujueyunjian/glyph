# 任务 0020：M2 文本力量——行变换最小集

- 状态：🚧 进行中
- 里程碑：M2 · 关联任务：#14（TaskList）· 负责人：Claude
- 开工：2026-06-03 · 收工：——

> 规范见 [`../../workflow/doc-driven-workflow.md`](../../workflow/doc-driven-workflow.md)。

---

## Plan（开工前）

### 背景 / 目标
巩固"快编辑器"底座，补齐 Sublime/VS Code 级行编辑。**Jobs 形态：命令面板动词 + 多光标 primitive，不是菜单墙。** pantheon 决策（见 roadmap「M2」）把文本力量列为 M2 首刀——高频、可组合、零 AI 依赖。

### 范围 / 非范围
- 范围（首刀）：
  - **纯 transform 模块**（可 TDD）：行尾去空格、排序、去重、大小写（upper/lower）、前缀、后缀。
  - **命令面板接入**无输入项的：去行尾空格 / 排序行 / 去重行 / 转大写 / 转小写。
  - **目标范围**：有选区 → 扩展到整行作用；无选区 → 整篇。
  - **不进首屏**：transform 是纯字符串函数；应用经 `view.dispatch`（不静态导入 CodeMirror，沿用 `goToLine` 模式）。
- 非范围（后续刀）：前缀/后缀（需输入框 UI）、前后缀、多选区批量作用、列编辑、菜单项形态。

### 方案大纲
- `src/features/textops/lineOps.ts`：纯函数 + `mapLines` helper（保留尾随换行）。
- `src/features/textops/lineOps.test.ts`：vitest 纯函数单测（node 环境，无 DOM）。
- `src/App.tsx`：`transformSelection(fn)`——取 activeView，选区扩整行 / 整篇，`view.dispatch` 替换；命令面板新增「编辑行」组动词。
- i18n：`textops.*`（zh-CN + en）。

### 涉及文件
- `src/features/textops/lineOps.ts`（新）+ `lineOps.test.ts`（新）
- `src/App.tsx`（transformSelection + 命令）
- `src/i18n/locales/{zh-CN,en}.json`

### 验证计划
- [ ] vitest 纯函数（trim/sort/dedupe/case/prefix/suffix + 尾随换行边界）
- [ ] `pnpm check` 全绿
- [ ] `pnpm build && pnpm perf:budget`：首屏不破红线

### 风险与对策
- 尾随换行处理 → `mapLines` 统一剥离/复原。
- 多选区暂只作用主选区（已记非范围；多光标批量下一刀）。

---

## Outcome（首刀 · 2026-06-03）

### 实际改动
- `src/features/textops/lineOps.ts`：纯函数 `trimLineEnds` / `sortLines` / `dedupeLines` / `toUpperCase` / `toLowerCase` / `addPrefix` / `addSuffix` + `mapLines`/`mapBlock` helper（统一保留尾随换行）。
- `src/features/textops/lineOps.test.ts`：8 例（含尾随换行边界、去重保序、前后缀不污染末空行）。
- `src/App.tsx`：`transformLines(fn)`——选区扩到整行 / 无选区作用整篇，经 `view.dispatch` 应用（不静态导入 CodeMirror，沿用 goToLine 模式，首屏安全）；命令面板新增「编辑行」组 5 动词（去行尾空格 / 排序 / 去重 / 转大写 / 转小写）。
- i18n：`textops.*`（zh-CN + en）。

### 验证结果
- ✅ `pnpm test`：30/30（行变换 lineOps 12 例）。
- ✅ 完整 `pnpm check` 全绿。
- ✅ `pnpm build && pnpm perf:budget`：首屏 127.7KB / 170KB（lineOps 纯函数 +~0.6KB，红线守住）。
- ⏳ GUI 行为（命令面板触发 → 编辑器内变换选区/整篇）待显示环境自验。

### 二刀补充（2026-06-03）
- **前缀 / 后缀 / 前后缀**：新增 `wrapLines` + 通用 `PromptDialog`（Radix，跟随主题，首字段自动聚焦、Enter 提交）；命令面板 +3 动词（每行加前缀/后缀/前后缀）。
- **多选区批量**：`transformLines` 改为作用于每个非空选区（各扩整行）+ `mergeSpans`（纯函数，已测）合并重叠 → 单次 `view.dispatch` 多 changes；无选区时整篇。

### 遗留问题（后续刀）
- 列编辑、join/split 等扩展行操作。
- GUI 行为（命令面板触发 / 输入框 / 多光标批量）待显示环境自验。

### 下一步
- 推进 M2 其余：跨文件搜索(ripgrep) / 文件树增删改+监听 / 分屏。
