# 任务 0025：Markdown 预览分屏（M3 差异化支柱②）

- 状态：🚧 落地并过 `pnpm check`；GUI 行为待显示自验
- 里程碑：M3 · 关联任务：#18（TaskList）· 负责人：Claude
- 开工：2026-06-03 · 收工：——

> 规范见 [`../../workflow/doc-driven-workflow.md`](../../workflow/doc-driven-workflow.md)。依据 [ADR-0002](../../adr/0002-markdown-live-preview.md)。

---

## Plan（开工前）

### 背景 / 目标
点亮差异化支柱②的第一块用户可见能力:`.md` 按需分屏预览（ADR-0002 v1 范围之一）。复用 0017 已测的 `renderMarkdown`（marked + DOMPurify 消毒），低回归(纯增量,不碰核心编辑/标签模型)、可编译验证。

### 范围 / 非范围
- 范围:`MarkdownPreview` 组件(React.lazy,marked/dompurify 不进首屏);`Ctrl/⌘+Shift+V` / 命令面板切换;预览分屏(仅 .md);防抖喂内容(不阻塞打字热路径);`.md-preview` token 化排版。
- 非范围(后续):Obsidian 式行内 Live Preview(CM decoration,需显示精调)、mermaid、KaTeX、滚动同步。

### 涉及文件
- `components/editor/MarkdownPreview.tsx`（新）+ `styles.css`（.md-preview 排版）
- `App.tsx`（懒加载 + previewOpen/Content + handleDocChange 防抖 + 分屏布局 + 命令/快捷键）+ i18n `preview.*`

### 验证计划
- [ ] `pnpm check` 全绿
- [ ] build + budget:marked/dompurify **不进首屏**(独立懒加载块)

---

## Outcome（2026-06-03）

### 实际改动
- `MarkdownPreview.tsx`:`useMemo(renderMarkdown(content))` → 已消毒 HTML `dangerouslySetInnerHTML`;`h-full overflow-auto`。React.lazy 加载。
- `styles.css`:`.md-preview` token 化排版(标题/段落/代码/pre/列表/引用/表格/链接/图片)。
- `App.tsx`:`previewOpen`/`previewContent` + `handleDocChange`(标脏 + 预览开启时 200ms 防抖读 getContent 刷新,不阻塞热路径) + `activeIsMarkdown` 判定 + 切换文件即刷新 effect;编辑区改 flex 行,预览仅在 `previewOpen && activeIsMarkdown` 时渲染(border-l 分隔);`Ctrl/⌘+Shift+V`(对齐 VS Code)+ 命令面板「Markdown 预览」。i18n `preview.title`(中英)。

### 验证结果
- ✅ 完整 `pnpm check` 全绿(36 前端测试 + Rust)。
- ✅ `pnpm build && pnpm perf:budget`:首屏 **131.1KB / 170KB**;marked/dompurify 落在独立懒加载块(~423KB raw),**未进首屏**,红线守住。
- ⏳ GUI 行为(切换、实时刷新、排版观感)待显示环境自验。

### 遗留问题
- 行内 Live Preview(CM decoration)、mermaid、KaTeX、滚动同步、编辑区与预览的 vscode/token 主题统一(见 ADR-0005 遗留)留后续。
- 大文档每次全量重渲染(已 200ms 防抖);后续可增量。

### 下一步
- 行内 Live Preview(decoration,需显示精调)或 M2 余项(分屏/LSP,需显示/语言服务器)。
