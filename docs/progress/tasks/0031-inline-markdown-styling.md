# 任务 0031：行内 Markdown 所见即美（编辑器内 · 护城河②）

- 状态：🚧 逻辑落地并过 `pnpm check`（4 单测验节点识别）；视觉观感待显示自验
- 里程碑：M3 · 负责人：Claude · 模式：盲做（低风险:仅 mark 装饰,不改文本）
- 开工/收工：2026-06-04

> 与 [0025] 预览分屏(渲染成 HTML 侧栏)**互补**:本任务让**编辑器本体**写作友好(边写边美),不必开侧栏。对齐 ADR-0002「Obsidian 式 Live Preview」的渐进第一步。

## Why
写作级 Markdown 是差异化支柱②。纯文本里 `# 标题` `**粗体**` 毫无视觉层次,写长文吃力。需要编辑器内对 md 结构着重渲染,且**不打断编辑**(标记仍可见可编)。

## How
- **`markdownDecorations.ts`**:Lezer 节点名 → 行内样式类,**仅 `Decoration.mark`(加 class,不改文本/不替换/不隐藏)** → 绝不影响编辑/选择/撤销(零破坏风险)。覆盖 commonmark + GFM:标题 H1–6、粗体、斜体、删除线、行内码、链接、引用。
- **viewport 限定**:`buildMarkdownDecorations` 只遍历传入的 `view.visibleRanges` → O(viewport) 而非 O(doc),每键只处理可见区(守"延迟即产品"红线)。
- **GFM 启用**:md 加载器改 `markdown({ base: markdownLanguage })` → 删除线/表格/任务列表均正确解析(经 context7 核对 lang-markdown 配置)。
- **懒加载**:样式插件随 md chunk 动态 import,首屏仅 +0.7KB(133.7/170KB)。
- 视觉(styles.css `.cm-md-*`)取克制路线:标题渐进放大加粗、码块淡底、引用淡化——醒目而不喧宾夺主。

## 验证
- ✅ 4 单测(在完整解析的文档上断言节点→类):标题/粗体/斜体/行内码/GFM删除线识别正确,纯文本零装饰。**节点名与 GFM 配置经测试坐实**。
- ✅ `pnpm check` 全绿(50 前端测试);build + budget 首屏 133.7/170KB。
- ⏳ 实际观感(字号层次/配色是否"开箱即美")待显示环境肉眼调校——逻辑已对,CSS 数值可后续微调(mark-only 故调 CSS 不涉风险)。

## 已知边界
- v1 是**着重渲染**(标记可见),非 Obsidian 完全的「光标离开行即隐藏标记」——后者需 replace 装饰 + 光标感知,留后续(风险更高,需显示验证)。
- 代码块内语法高亮仍由语言层负责;本插件不碰 FencedCode 内部。
