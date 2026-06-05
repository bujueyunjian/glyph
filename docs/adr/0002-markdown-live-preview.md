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

## Addendum 2026-06-05：Mermaid 图渲染（任务 0050）

原计划「Mermaid 留插件」。用户反馈预览里的 flowchart 等图无法显示，遂在第一方预览中落地 mermaid，守住两条红线：

- **footprint**：mermaid（~MB 级）**只在文档确含 ```mermaid 块时**经 `import("mermaid")` 动态加载——既不进首屏，也不进基础预览 chunk（`features/markdown/mermaid.ts` 是唯一 import 处）。首屏体积门禁新增「entry chunk 不得含 mermaid」硬断言。
- **安全（本 ADR 安全红线的延伸）**：打开的 .md 是**不可信输入**。`securityLevel:'strict'` + **顶层 `htmlLabels:false`**（实测：仅设 `flowchart.htmlLabels` 无效，标签仍走 `<foreignObject>` HTML → 被 SVG 消毒剥空）+ 对 mermaid 输出 SVG **再过一遍 DOMPurify（SVG profile）** 做防御纵深（strict 历史上仍出过可执行输出，Tauri 端 XSS 可升级 RCE）。渲染失败响亮（内联错误占位），绝不静默吞或白屏。
- 主题跟随 app（dark/light），按需 effect + 哈希 SVG 缓存避免编辑时反复重渲染。
