# 任务 0045：文档大纲面板

- 状态：✅ 完成
- 里程碑：M2 · 关联任务：#23(TaskList)· 负责人：Claude
- 开工：2026-06-04 · 收工：2026-06-04

> pantheon 决策(product 场景 Bezos+Jobs+Musk):自主跳过隐形且 headless 不可验的 signature help,
> 选**可见 + 可验 + 复用已测 LSP 符号**的文档大纲——经用户在场确认采纳。

---

## Plan

### 背景 / 目标
LSP 文档符号已有(QuickOpen `@` 用 `flattenSymbols`)。补一个**常驻大纲面板**:列出当前文件结构、
按层级缩进、点击跳转——回应「功能要看得见」+ 提升日用导航。

### 范围 / 非范围
- 范围:`outlineSymbols`(带 depth 层级)+ 单测;`OutlinePanel`(缩进/kind 标签/点击跳转/空态);
  App 接入(documentSymbol 拉取 + 开关 + 命令 + 视图菜单 + `Ctrl/⌘⇧O`);i18n。
- 非范围:符号实时随编辑刷新(只在开/切文件拉,守延迟高线);大纲内过滤搜索(QuickOpen `@` 已覆盖)。

### 涉及文件
- `src/features/lsp/protocol.ts(+test)` —— `outlineSymbols()` + `OutlineSymbol`
- `src/components/command/OutlinePanel.tsx` —— 右侧大纲面板
- `src/App.tsx` —— 状态/拉取 effect/命令/菜单/快捷键/渲染
- `src/components/workbench/MenuBar.tsx` —— 视图菜单「文档大纲」
- i18n zh-CN/en —— `outline.*`

### 验证计划
- [x] typecheck / lint / format
- [x] 单测(outlineSymbols)
- [x] build + 体积门禁
- [x] Playwright(面板壳 + needsLsp 态)

---

## Outcome

### 实际改动
- `outlineSymbols(result)`:递归 DocumentSymbol(或扁平 SymbolInformation)→ `{name,line,kind,depth}[]`,
  depth 供缩进;与 `flattenSymbols`(纯扁平,`@` 用)并存,不动后者。2 个单测。
- `OutlinePanel`:右侧 260px 面板,按 depth 缩进、行尾 kind 简短标签(SymbolKind→label 映射)、
  点击跳转;区分 `loading` / `empty`(无符号)/ `needsLsp`(语言服务器未连)三态。
- App:`outlineOpen/outlineSyms/outlineLoading` 状态;effect 在「面板开 + 有聚焦文件 + serverId 就绪」时
  拉 `documentSymbol`、切文件自动刷新、不挂打字热路径;命令面板 `view.outline` + 视图菜单 + `Ctrl/⌘⇧O`;
  跳转用 `goToLine(line+1)`(LSP 0 基 → 1 基)。

### 验证结果
- typecheck / lint(--max-warnings=0)/ format ✅
- 前端单测 **104 passed**(新增 outlineSymbols 2 例)
- build ✅;首屏 gzip **142.0KB / 170KB**(OutlinePanel 约 +1KB)
- Playwright:视图菜单开大纲面板,显示标题「文档大纲」+「需要语言服务器」态(dev 无 LSP),
  壳/开关/i18n 确认;符号行渲染(缩进/kind/跳转)需真机 LSP,映射已单测。

### 遗留问题
- 符号行的缩进/kind/跳转像素级观感需真机(Tauri + 已装 LSP)验;dev 无 LSP 仅能验空态。
- 大纲不随编辑实时刷新(切文件/重开才刷)——刻意为之守延迟高线,后续可加防抖刷新。

### 下一步
- 候选延续:大纲高亮跟随光标当前符号;signature help(真机验);agent cwd 钉工作区(ADR-0009)。
