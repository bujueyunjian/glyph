# 任务 0042:LSP 补全 + 诊断接入编辑器(pantheon 裁决的下一步 A)

- 状态:🚧 落地并过 `pnpm check`(82 前端 + 18 Rust + 2 e2e);补全弹窗/波浪线渲染待 GUI 验
- 里程碑:M2 智能(LSP)· 负责人:Claude · 开工/收工:2026-06-04

> pantheon(Jobs/Bezos/Musk/Linus)裁决:把已验证的 LSP 后端接成**可见的补全 + 诊断**是下一步——可日用地板 + 边际成本最低 + 数据层 headless 可验。

## How(协议在 Rust,前端只渲染)
- **`protocol.ts`(纯函数,7 单测)**:UTF-16 Position ↔ CM 偏移(越界钳位防炸)、completion 响应 → CM 补全项(kind→type/detail)、publishDiagnostics → CM lint 诊断(range 换算 + severity)。**最易错的一层被测住**。
- **`editor.ts`**:`lspEditorExtensions(ctx)` = 补全源(`textDocument/completion` → `toCmCompletions`)+ 同步插件(挂载 didOpen、防抖 didChange 全量同步、卸载 didClose;监听 `lsp://message` 的 publishDiagnostics 按 uri → `setDiagnostics` 波浪线)。
- **`servers.ts`**:加 `languageIdForExtension`(didOpen 用)。
- **接线**:`useLsp` 暴露 serverId;App memo `lspCtx`(serverId+uri+languageId)传给**聚焦那一个编辑器**(主/分屏二选一,避免同 uri 双 didOpen);CodeEditor `lsp` prop 在场时挂 LSP 扩展。
- 依赖:加 `@codemirror/autocomplete` + `@codemirror/lint`(随编辑器懒加载,不进首屏)。

## 验证
- ✅ `pnpm check` 全绿(82 前端测试,+protocol 7);build + budget 首屏 136.4/170KB(LSP 重依赖在懒加载 editor chunk)。
- ✅ 数据链已验:lsp_request/completion 往返对**真实 rust-analyzer** e2e 通过(0039);`toCmCompletions`/`toCmDiagnostics`/位置换算单测覆盖。
- ⏳ 待 GUI 验:补全弹窗实际弹出、诊断波浪线位置、didChange→诊断刷新闭环。装 rust-analyzer + 打开 .rs 文件即可见(状态栏点变绿)。

## 已知边界(v1)
- 仅聚焦编辑器接 LSP(分屏非聚焦侧不接,避免同 uri 双 didOpen);全量文本同步(didChange 发全文,简单;增量同步留后续)。
- 补全为标识符触发 + 显式触发;hover/跳转/重命名/signature help 留后续。
