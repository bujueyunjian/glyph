# 任务 0038：LSP initialize 握手 + 对真实 rust-analyzer 端到端验证

- 状态：✅ 落地;**对真实 rust-analyzer 端到端通过**(`cargo test -- --ignored`);clippy/check 全绿
- 里程碑：M2 智能(LSP) · 负责人：Claude · 开工/收工：2026-06-04

> **关键认知修正**:此前判定 LSP「需显示环境、不可 headless 验证」是基于"前端 `@codemirror/lsp-client` 直连"的架构。但项目铁律是**「重活在 Rust，WebView 只渲染」**——LSP 协议本就该在 Rust 跑。一旦如此,**且本机已可装 rust-analyzer**,LSP 客户端就能在无显示环境对真实语言服务器端到端验证(纯 stdio)。据此推翻原判,把 LSP 往前推了一大步。

## Why
LSP 会话起始必经 `initialize` 握手(协商 capabilities)+ `initialized` 通知,之后才能 didOpen/completion/diagnostics。这是整个 LSP 的入口,且可对真实服务器验证。

## How（`src-tauri/src/lsp.rs`，建在 0032 帧编解码上）
- `initialize_params(root_uri)`:构造 initialize 参数(rootUri + clientInfo + 基本 capabilities),抽出可单测。
- `read_response(reader, id)`:读帧直到目标 id 的响应,握手期忽略服务器通知(如 window/logMessage)。
- `lsp_initialize(reader, stdin, root_uri)`:发 initialize(id=0)→读响应→发 initialized 通知 → 返回 capabilities。
- `lsp_start` 集成握手:spawn → 同步握手 → 发 `lsp://ready`(带 capabilities)→ reader 移入线程读后续帧。失败响亮返回 Err。

## 验证
- ✅ **端到端对真实 rust-analyzer 1.95.0**:`initialize_handshake_against_rust_analyzer`(`#[ignore]`,本地 `cargo test -- --ignored`)spawn rust-analyzer → 握手 → **断言返回 capabilities**,通过。**全栈(spawn+帧+握手)经真实服务器坐实**。
- ✅ 单测 `initialize_params_carry_root_and_client_info` 验请求形状。
- ✅ `cargo clippy -D warnings` 干净;`pnpm check` 全绿(14 Rust 测试 + 1 ignored;66 前端)。
- CI(ubuntu)无 rust-analyzer 故握手测 `#[ignore]`(CI 跳过,不失败);本地验证。

## 下一步(同架构,可继续 headless 验证)
- `textDocument/didOpen` + `completion`/`hover` 请求 + `publishDiagnostics` 通知路由到前端;前端做 CM 补全源 + 诊断标记(渲染层)。
- 按扩展名映射语言服务器命令(rust→rust-analyzer 等);UTF-16 位置编码换算。
- completion 端到端测试可能需 rust-analyzer 索引就绪(较慢),考虑用更轻的 server 或放宽超时。
