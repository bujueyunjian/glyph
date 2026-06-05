# 任务 0052：Markdown 可编辑 Live Preview 与源码开关

- 状态：✅ 完成
- 里程碑：M3 · 关联任务：Markdown Live Preview 真机体验 · 负责人：Codex
- 开工：2026-06-05 · 收工：2026-06-05

> 规范见 [`../../workflow/doc-driven-workflow.md`](../../workflow/doc-driven-workflow.md)。开工前填「Plan」，收工后补「Outcome」。

---

## Plan（开工前）

### 背景 / 目标
用户反馈 Markdown 默认不应变成只读预览,应参考 Typora 的可编辑所见即所得体验;源码只需要通过顶部菜单选择是否展示。目标是在不重写编辑器为真正 WYSIWYG 的前提下,把 `.md` 默认调整为可编辑 Live Preview:保留 CodeMirror 编辑能力,隐藏非光标行的 Markdown 标记;原始源码模式作为可选视图。

### 范围 / 非范围
- 范围:Markdown 默认显示可编辑 Live Preview;顶部「视图」菜单与命令面板提供显示/隐藏源码入口;源码显示偏好持久化;静态渲染预览作为可选辅助面板。
- 非范围:不实现可直接编辑渲染 DOM 的完整 Typora 编辑器;不改变 Markdown 渲染/消毒/mermaid 逻辑。

### 方案大纲
新增 `markdownSourceVisible` 状态,默认 `false`。Markdown 文件激活时始终显示 CodeMirror;源码关闭时强制开启 `markdownLivePreview`,源码打开时关闭 conceal 以显示原始 Markdown。静态 `MarkdownPreview` 改为命令面板可选辅助面板(用于 Mermaid 等完整渲染),默认不替代编辑器。

### 涉及文件
- `src/App.tsx` —— Markdown 源码模式、静态预览辅助面板、快捷键与命令面板。
- `src/components/workbench/MenuBar.tsx` —— 顶部视图菜单的 Markdown 源码开关。
- `src/i18n/locales/{zh-CN,en}.json` —— 菜单文案。

### 验证计划
- [x] `pnpm.cmd typecheck`
- [x] `pnpm.cmd lint`
- [x] `cargo test --lib`
- [x] `cargo fmt --check`

### 风险与对策
- 误把 Markdown 做成不可编辑预览 → 默认始终显示 CodeMirror Live Preview,静态预览只作为可选辅助面板。
- 用户需要改原始源码 → 通过「视图 → 显示 Markdown 源码」或 `Ctrl/⌘⇧V` 切换源码模式。

---

## Outcome（收工后）

### 实际改动
Markdown 文件默认显示可编辑 Live Preview,不再进入只读渲染预览。顶部「视图」菜单和命令面板可切换 Markdown 源码模式;命令面板另保留静态 Markdown 预览作为辅助面板。

### 验证结果
`pnpm.cmd typecheck` 通过;`pnpm.cmd lint` 通过;`cargo test --lib` 通过(22 passed,2 ignored);`cargo fmt --check` 通过。针对改动文件运行 Prettier check 仍报格式问题,但当前仓库远端已有文件级 Prettier 格式债,本次不运行 `--write` 以免大面积重排。

### 遗留问题
- 当前是 CodeMirror Live Preview,不是完整 Typora 式“直接编辑渲染 DOM”。真正 WYSIWYG 编辑需另开架构任务。

### 下一步
- 真机检查 Markdown 可编辑、源码模式切换、静态预览辅助面板与 Mermaid 渲染。
