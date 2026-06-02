# 调研 · Markdown 与所见即所得

- 状态：✅ 完成（2026-06-02）
- 决策固化于 [`../adr/0002-markdown-live-preview.md`](../adr/0002-markdown-live-preview.md)

## 结论：内建一等 Markdown，走 Live Preview，做成旗舰差异化

用户明确要求把"Typora 式所见即所得"作为魅力点与创新点。调研结论是：**值得做，但走 Obsidian 式 Live Preview，而非 Typora 全 WYSIWYG**。

### 三档成本阶梯
1. 仅源码 + 语法高亮（Zed 现状）
2. 分屏实时预览（VS Code 式）
3. **行内 Live Preview**（Obsidian/MarkText 式）—— 我们的目标

### 为什么 Live Preview 而非 Typora 全 WYSIWYG
- **关键事实**：Obsidian 的 Live Preview **正是基于 CodeMirror 6** 实现的——与我们核心栈同源，技术路径已被验证，不是赌博。CM6 的 widget/replace decorations 就是其机制。
- **source-of-truth = Markdown 文本**：光标所在行显示原始语法，移开即渲染成品。拿到 Typora ~90% 的魅力。
- **避开 Typora 的坑**：Typora 用 contenteditable 把语法完全藏起来，代价是源码定位、撤销栈、未来协作都更脆。
- 可叠加**专注/打字机/全 WYSIWYG 模式**给纯写作者（创新点），但建在稳的 source-of-truth 地基上。
- 只在 `.md` 语言模式激活，**不拖累代码编辑的延迟与轻量**。

## 标准与库

- **GFM = CommonMark 严格超集**，多 5 个扩展：表格、任务列表、删除线、autolink、raw-HTML 规则。
- Math / Mermaid / alerts / footnotes / emoji 是 **GitHub.com 层，不属 GFM** —— 天然的"核心 vs 插件"分界线。
- 渲染库：
  - **comrak**（Rust）：CommonMark 652/652、GFM 670/670 全过，默认消毒 HTML；有完整 AST，故非最快。
  - **pulldown-cmark**（Rust）：快、低 footprint，rustdoc/mdBook 在用；AST 轻，frontmatter 需旁路 crate。
  - **markdown-it**（JS）：可扩展，但 raw HTML 是 XSS 向量，需 DOMPurify。
- 体积：**KaTeX ~348KB vs Mermaid ~2.8MB**（8x）→ Mermaid 必须懒加载/留插件。

## v1 深度建议

- ✅ 语法高亮 + 按需分屏预览 + **行内 Live Preview** + GFM 核心扩展（表格/任务列表/删除线）+ frontmatter + 轻量行内渲染。
- ⏳ KaTeX 懒加载（gated）。
- ⏳ Mermaid 留作插件（不进核心）。
- 实现成**第一方插件**（dogfood 插件 API），见 [`../adr/0003-plugin-first-architecture.md`](../adr/0003-plugin-first-architecture.md)。

## 风险

- 不可信 Markdown 必须沙箱 + 消毒；绝不裸传 raw HTML 而无 CSP；DOMPurify 有过 CVE，须锁版本并更新。
- 体积蔓延：懒加载 KaTeX，Mermaid 出核心。
- CM6 行内 decoration 管理琐碎；**不要追 Typora 全等价**。
- 高亮器与预览器的 GFM flag 要对齐；comrak 比 pulldown-cmark 慢，大文档要 debounce。
- UI 要明示 alerts/emoji/Mermaid 是插件或 opt-in。
