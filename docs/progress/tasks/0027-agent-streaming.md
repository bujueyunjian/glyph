# 任务 0027：Agent 流式对话（M4 支柱③）

- 状态：🚧 落地并过 `pnpm check` + clippy；端到端待装 ACP agent 自验
- 里程碑：M4 · 负责人：Claude · 模式：盲做（实现 + CI 编译验证）
- 开工/收工：2026-06-04

> 承接 [`0024-acp-client.md`](0024-acp-client.md)（一次性 prompt）。本任务把响应从"一次性取完整文本"升级为"分块流式回流 UI"——贴合北极星"延迟即产品"：用户看到逐字输出而非干等。

---

## Why
一次性 `agent_oneshot` 需等整轮结束才显示，长回答体验差。ACP 的 `session/update` 本就分块（`agent_message_chunk`），应边收边显。

## How
- **Rust（`agent.rs`）**：新增 `agent_stream(app, agent_cmd, prompt)` 命令——后台线程跑 `run_stream`→`stream_turn`（复用既有 `rpc_request`/`pump_until`/`write_line`/`kill`），prompt 阶段改用新 `pump_emit`：每个 `agent_message_chunk` 经 `app.emit("agent://chunk", text)` 推送；结束发 `agent://done`，出错发 `agent://error`。命令即时返回（不阻塞 IPC）。Windows 仍打 `CREATE_NO_WINDOW`。
- **前端（`agentApi.ts`）**：`agentStream(agentCmd, prompt, handlers)` 先 `listen` 三个事件再触发命令，返回 `cleanup`（解绑监听）。
- **前端（`App.tsx`）**：`askAgent` 开空对话框 → 分块 `setAgentResult(prev => prev + text)` 追加；`done/error` 解绑；`closeAgentResult` 关闭时解绑（防监听泄漏）。`agentCleanupRef` 持有解绑函数。命令面板「向 Agent 提问」改走流式。

## 验证
- ✅ `cargo clippy -D warnings` 干净；`cargo test` 8 通过。
- ✅ `pnpm check` 全绿；build + budget 首屏 **133.0KB / 170KB**。
- ⏳ 端到端（真 agent 逐块流式 + 出错路径）需本地装 `claude-code-acp` 等 ACP 适配器 + 运行 app 自验。

## 已知限制（v1）
- 每次提问是**独立一次性会话**（spawn→prompt→收完即 kill），无跨轮对话记忆 / 无会话保活。
- agent→client 的 fs/terminal/permission 请求仍统一回错误（不支持）；diff 审查 / 工具权限 UI 留后续。
- 事件全局未按会话隔离 → v1 同一时刻仅一个流式会话；中途关闭对话框仅解绑前端，后台会话自然跑完（无 `agent_stop`）。

## 下一步（M4 完整体）
- 会话保活 + 多轮上下文；agent→client 请求的真实处理（文件读写授权、终端、权限弹窗）；diff 审查 UI（ADR-0007）；MCP 客户端（`rmcp`）。
