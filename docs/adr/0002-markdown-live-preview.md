# ADR-0002：Markdown 走 Obsidian 式 Live Preview，而非 Typora 全 WYSIWYG

- 状态：✅ Accepted（2026-06-02）
- 关联：[`../research/04-markdown.md`](../research/04-markdown.md)

## Context

利益相关方明确希望把"Typora 式所见即所得"作为产品魅力与创新点。但 Glyph 是开发者优先的轻量代码编辑器，需在"写作级体验"与"不臃肿、低延迟、source-of-truth"之间取平衡。

## Options

1. **仅源码 + 语法高亮**（Zed 现状）
2. **分屏实时预览**（VS Code 式）
3. **行内 Live Preview**（Obsidian/MarkText 式，source-of-truth）
4. **全 WYSIWYG**（Typora 式，contenteditable，隐藏所有语法）

## Decision

默认采用 **Option 3：Obsidian 式行内 Live Preview**，同时保留 Option 2（按需分屏）；**可叠加专注/打字机/全 WYSIWYG 模式**作为进阶选项，但底层始终是 source-of-truth Markdown 文本。

### 依据
- **关键事实**：Obsidian 的 Live Preview **正是基于 CodeMirror 6**（与我们核心栈同源）→ 技术路径已被验证，非赌博；机制是 CM6 widget/replace decorations。
- source-of-truth：光标行显源码、移开即渲染，拿到 Typora ~90% 魅力。
- 避开 Typora 全 WYSIWYG 的坑：contenteditable 在源码定位/撤销栈/未来协作上更脆。
- 只在 `.md` 模式激活，不拖累代码编辑延迟。

### 同行佐证
- **Obsidian**：CM6 + Live Preview 的成功范例。
- **MarkText**：开源 source-of-truth WYSIWYG-hybrid。

## Consequences

- ✅ 旗舰差异化（写作级 MD）落地且技术风险可控。
- ✅ 实现成**第一方插件**（dogfood 插件 API，见 [`0003`](0003-plugin-first-architecture.md)）。
- v1 深度：高亮 + 按需分屏 + Live Preview + GFM 核心扩展 + frontmatter + 轻量行内渲染；KaTeX 懒加载、Mermaid 留插件。
- ⚠️ 安全：不可信 MD 必须消毒（DOMPurify，锁版本）+ CSP，绝不裸传 raw HTML。
- ⚠️ CM6 行内 decoration 管理琐碎 → **不追 Typora 全等价**；高亮器与预览器 GFM flag 对齐，大文档 debounce。
- 渲染库倾向：Rust 侧 comrak（合规/默认消毒）或 pulldown-cmark（快/轻），待实现期定。
