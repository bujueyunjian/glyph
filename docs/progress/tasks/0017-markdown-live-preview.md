# 任务 0017：Markdown Live Preview（窄垂直切片，第一方 dogfood）

- 状态：⏳ 计划中
- 里程碑：M3（差异化支柱②）· 关联任务：#?（TaskList）· 负责人：待定
- 开工：—— · 收工：——

> 规范见 [`../../workflow/doc-driven-workflow.md`](../../workflow/doc-driven-workflow.md)。开工前填「Plan」，收工后补「Outcome」。
> 架构依据：[`../../adr/0006-internal-extension-points.md`](../../adr/0006-internal-extension-points.md)（先读，本任务是其首个 dogfood 消费者）。

---

## Plan（开工前）

### 背景 / 目标

差异化支柱②的第一砖：Obsidian 式行内 Live Preview（source-of-truth，光标行显源码、移开即渲染），ADR-0002 已锁。同时作为 ADR-0006「内部扩展点 schema v0」的**首个 dogfood 消费者**，偿还 ADR-0003「插件优先」的首付。

**前置硬约束**（采纳红队修正）：必须在任务 0016（性能门禁）的尺子就位后、且**在门禁注视下**开发——MD 行内 decoration + 渲染是最可能吃掉键入帧预算的功能。

### 范围 / 非范围

- 范围（窄切片）：
  1. `.md` 行内 Live Preview：CM6 原生 `ViewPlugin` / `Decoration`，**只算 `view.visibleRanges` + `RangeSetBuilder`**（防大文档退化）。
  2. GFM 核心扩展 + frontmatter + 轻量行内渲染（标题 / 强调 / 列表 / 链接 / 代码块 / 引用等）。
  3. raw HTML 经 **DOMPurify（锁版本）** 消毒；**绝不放宽 CSP、绝不加 `unsafe-eval`**（现有 `script-src 'self'` 不动）。
  4. 经 **ADR-0006 内部接口**以「装饰提供者」形态接入 `CodeEditor`，**非散落 `if` 焊死**（这是 ADR-0006 的验收硬标准）。
  5. 顺手把 `CodeEditor` 的 `vscodeDark/Light` 切到 token 驱动（否则预览用 token 配色、编辑区用 vscode 配色撞色，破「开箱即美」；呼应 ADR-0005 遗留项）。
- 非范围（明确不做，属镀金 / 后续）：KaTeX、Mermaid、按需分屏预览、专注 / 打字机模式、Typora 式全 WYSIWYG。

### 方案大纲

- 新 `src/features/markdown/`：`livePreview.ts`（CM6 装饰扩展，视口渲染）+ `render.ts`（markdown-it/marked → DOMPurify）+ 注册为 ADR-0006 的装饰提供者。
- `languageRegistry.ts` 的 `md` 分支按需 `import()` 拉渲染依赖（**动态导入，不进首屏**，守性能红线）。
- `CodeEditor.tsx`：经内部接口挂载装饰提供者；主题切 token。
- 渲染依赖（markdown-it / marked + DOMPurify）锁版本、懒加载。

### 涉及文件

- `src/features/markdown/*`（新）—— Live Preview 装饰 + 渲染 + 消毒
- `src/components/editor/CodeEditor.tsx` —— 接装饰提供者 + token 主题
- `src/components/editor/languageRegistry.ts` —— `md` 分支接 Live Preview（动态 import）
- 内部扩展点定义文件（按 ADR-0006，命名标注 internal/unstable）
- `package.json` —— DOMPurify + markdown 渲染库（锁版本，懒加载）
- `src/i18n/locales/{zh-CN,en}.json` —— 预览相关文案（如有）

### 验证计划

- [ ] typecheck / lint / format / clippy
- [ ] build：md 渲染依赖**不进首屏** chunk（无 >500KB 警告）
- [ ] 性能：键入延迟门禁（0016）**不回退**；大文档（1MB / 万行 MD）+ 超长单行不退化（视口渲染验证）
- [ ] 安全：XSS 用例（`<script>` / `onerror` / `javascript:` 等）经 DOMPurify 全部消毒；CSP 未放宽
- [ ] 架构：MD 经 ADR-0006 内部接口接入，可证明「核心功能与未来插件走同一路径」

### 风险与对策

- decoration 重算拖累键入 → 只算视口 + debounce（ADR-0002 已点名）。
- 渲染依赖若静态导入会破首屏红线 → 动态 `import()`。
- 「扩展缝」滑向插件框架 → 严守 ADR-0006 边界（仅 MD 消费、不文档化 / 不承诺稳定）。
- DOMPurify 后注入 DOM 仍需防 CSP 例外被放宽 → 红线写死：为渲染放宽 CSP 一律拒绝。

---

## Outcome（收工后）

### 实际改动
<待填>

### 验证结果
<待填；失败如实记录，附输出，不掩盖>

### 遗留问题
<待填>

### 下一步
<待填>
