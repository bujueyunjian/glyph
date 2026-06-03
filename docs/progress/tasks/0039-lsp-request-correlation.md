# 任务 0039：LSP 请求/响应关联 + completion 往返(对真实 rust-analyzer)

- 状态：✅ 落地;**completion 往返对真实 rust-analyzer 端到端通过**;clippy/check 全绿
- 里程碑：M2 智能(LSP) · 负责人：Claude · 开工/收工：2026-06-04

> 承接 0038 握手。LSP 是异步 JSON-RPC:请求与响应靠 id 关联,服务器还会主动推通知(诊断)。本任务在 Rust 建**关联层**——读线程按 id 把响应路由给等待的命令,通知则推 UI。这样前端可发 completion/hover 等请求并拿到结果(协议在 Rust,前端只渲染,守铁律)。

## How（`src-tauri/src/lsp.rs`）
- **`PendingMap`** = `Arc<Mutex<HashMap<请求id, Sender>>>`:待响应表。
- **读线程路由**:每帧消息 `route_response` —— id 命中 pending 则 `send` 给等待者(不推 UI);否则(通知/服务器请求/未匹配)推 `lsp://message`。
- **`lsp_request(id, method, params)`** 命令:分配请求 id、登记 pending、写帧、释放锁后 `recv_timeout(10s)` 等响应;超时清理等待者并响亮报错;服务器 error 响应转 Err。
- `ManagedServer` 加 `next_req_id` + `pending`;lib.rs 注册 `lsp_request`。

## 验证
- ✅ **端到端 completion 对真实 rust-analyzer 1.95**:`completion_roundtrip_against_rust_analyzer`(`#[ignore]`)—— initialize → didOpen → completion 请求 → **收到 id=1 响应(result/error 皆证往返通)**。连同 0038 握手测,**spawn+帧+握手+请求/响应往返全栈经真实服务器坐实**。
- ✅ 单测 `routes_response_to_waiting_request_by_id`(命中路由+移除)、`notifications_and_unmatched_ids_are_not_routed`(通知/服务器请求不误路由)—— 关联逻辑可靠覆盖。
- ✅ `cargo clippy -D warnings` 干净;`pnpm check` 全绿(16 Rust 测 + 2 ignored;66 前端)。
- CI(无 rust-analyzer)跳过 2 个 `#[ignore]` e2e;本地验证。

## 下一步
- 前端:文件打开时 `lsp_send` didOpen、编辑时 didChange(防抖);`lsp_request` 接 CM 补全源 / hover tooltip;`lsp://message` 的 publishDiagnostics → CM 诊断标记(渲染层,需显示验观感)。
- 按扩展名映射语言服务器命令 + UTF-16 位置换算。
