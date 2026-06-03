# 任务 0032：LSP 传输层地基（table-stakes，分层落地）

- 状态：🚧 传输层落地并 cargo 测过（5 帧编解码单测）；前端 lsp-client 桥接 + 端到端待语言服务器
- 里程碑：M2 智能 · 负责人：Claude · 模式：分层落地（对齐 ACP 客户端 0024）
- 开工/收工：2026-06-04

> LSP 是补全/诊断/跳转的 table-stakes。完整集成需「真实语言服务器 + 运行 app」端到端验证，无法在无环境下负责任地一次做完。故按 **0024 ACP 客户端同样的分层策略**:先做**可单测的传输层**(最易出错的帧编解码),再在有环境时接前端与协议。

## Why
LSP over stdio 用 `Content-Length` 帧封装 JSON-RPC(与 ACP 的 ndjson **不同**),需独立的帧编解码 + 服务器子进程管理。这一层纯粹、可在无服务器下单测,是整个 LSP 的正确性基石。

## How（`src-tauri/src/lsp.rs`，镜像 `proc.rs` 模式）
- `encode_message`:`Content-Length: {字节数}\r\n\r\n{JSON}` 封帧。
- `read_message`:逐行解析头(字段名大小写不敏感)拿长度,再**按字节精确读** N 字节体(体内可含换行,不能按行读);消息边界 EOF → `Ok(None)`;头缺失/截断 → `Err`(失败响亮)。
- `LspRegistry`(Tauri State)+ `lsp_start`/`lsp_send`/`lsp_stop`:spawn 语言服务器、后台线程读帧经 `lsp://message` 推 UI、结束发 `lsp://closed`、写入自动封帧、终止移除。Windows 打 `CREATE_NO_WINDOW`。
- lib.rs 注册 state + 3 命令。

## 验证
- ✅ 5 cargo 单测:封帧头正确、单条往返+EOF、**一个流内多条帧**、**体内含换行按字节读**、**缺 Content-Length 报错**。共 13 Rust 测试全过。
- ✅ `cargo clippy -D warnings` 干净;`pnpm check` 全绿(typecheck/契约/前端 50 测试不受影响)。

## 下一步（需环境）
- 前端 `@codemirror/lsp-client` 桥接:实现 Transport 把 JSON 消息 ↔ `lsp_send`/`lsp://message`,接 LSPClient + `languageServerSupport`。
- 按扩展名映射语言服务器命令(如 `rust-analyzer`/`typescript-language-server`),`initialize` 握手 + 能力协商 + 增量同步。
- 端到端:装语言服务器 + 运行 app 验补全/诊断/跳转 + UTF-16 位置编码。
