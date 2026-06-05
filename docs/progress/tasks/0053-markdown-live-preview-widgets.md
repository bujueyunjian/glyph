# 任务 0053：Markdown Live Preview 小组件

- 状态：✅ 完成
- 里程碑：M3 · 关联任务：Markdown Live Preview / Typora-like 编辑体验 · 负责人：Codex
- 开工：2026-06-05 · 收工：2026-06-05

> 规范见 [`../../workflow/doc-driven-workflow.md`](../../workflow/doc-driven-workflow.md)。开工前填《Plan》，收工后补《Outcome》。

---

## Plan（开工前）

### 背景 / 目标

用户希望 Markdown 文档像 Typora 一样默认可直接编辑渲染结果，而不是左侧源码 + 右侧只读预览。0052 已把默认视图改回可编辑 CodeMirror Live Preview，本任务继续增强最常见的所见即所得反馈：任务列表复选框与图片行预览。

### 范围 / 非范围

- 范围：在 Markdown Live Preview 中把 GFM 任务列表标记渲染为可点击复选框；把非光标行图片语法渲染为图片卡片；光标进入图片行时恢复源码编辑。
- 非范围：不重写为 ProseMirror/TipTap 等完整 DOM WYSIWYG 编辑器；不实现本地图片 asset protocol；不改变 Markdown 静态预览、Mermaid 渲染和消毒逻辑。

### 方案大纲

继续沿用 CodeMirror 6 Decoration/Widget 方案，仅在可见区遍历 Markdown 语法树，避免每次输入扫描全文。`TaskMarker` 替换为 checkbox widget，点击后直接 dispatch 文档变更；`Image` 节点在非光标行替换为 image card widget，光标行保留原始 Markdown 源码，保证可编辑性。

### 涉及文件

- `src/components/editor/markdownDecorations.ts` —— 任务复选框 widget、图片 widget、图片语法解析。
- `src/components/editor/markdownDecorations.test.ts` —— Live Preview widget 与图片解析单测。
- `src/styles.css` —— 任务复选框与图片卡片样式。

### 验证计划

- [x] `pnpm.cmd typecheck`
- [x] `pnpm.cmd lint`
- [x] `pnpm.cmd vitest run src/components/editor/markdownDecorations.test.ts`
- [x] `cargo test --lib`
- [x] `cargo fmt --check`
- [x] `pnpm.cmd tauri build --bundles nsis`

### 风险与对策

- 大文档输入卡顿 → 仍只按 `view.visibleRanges` 构建装饰，复杂度保持 O(viewport)。
- 图片 widget 阻断编辑 → 光标所在行不替换图片语法，用户进入该行即可编辑源码。
- 本地图片预览权限过宽 → 当前不启用 Tauri asset protocol，未实现本地文件图片预览，避免扩大文件暴露面。

---

## Outcome（收工后）

### 实际改动

Markdown Live Preview 增加两类 Typora-like 小组件：任务列表的 `[ ]` / `[x]` 被渲染为可点击 checkbox，点击会切换原文标记；非光标行 `![alt](url)` 被渲染为图片卡片，光标进入该行后恢复 Markdown 源码用于编辑。

### 验证结果

`pnpm.cmd typecheck` 通过；`pnpm.cmd lint` 通过；`pnpm.cmd vitest run src/components/editor/markdownDecorations.test.ts` 通过（16 tests）；`cargo test --lib` 通过（22 passed，2 ignored）；`cargo fmt --check` 通过；`pnpm.cmd tauri build --bundles nsis` 通过并生成 `src-tauri/target/release/bundle/nsis/Glyph_0.0.14_x64-setup.exe`。`pnpm.cmd run tauri:build` 的全量 bundle 在 MSI 阶段失败，原因是本机 `msiexec` 正占用 MSI 文件；NSIS 安装包已单独构建成功。`pnpm.cmd format:check` 仍失败，原因是远端当前已有 71 个 `src/**/*` 文件不符合 Prettier 输出，本任务未执行全量 `--write` 以避免大面积重排。

### 遗留问题

- 这仍是 CodeMirror Live Preview，不是完整 Typora DOM WYSIWYG 架构。
- 图片预览当前仅对 CSP 允许的远程/内联图片最可靠；本地相对图片需要后续单独设计 Tauri asset scope。

### 下一步

- 真机检查 Markdown 编辑手感：任务复选框点击、图片行进入源码、源码模式切换。
- 如要完整 Typora DOM 编辑，另开架构任务评估 ProseMirror/TipTap 与 Markdown AST 同步成本。
