# ADR-0008：M4 Agent 宿主实现选型——官方 `agent-client-protocol` + `rmcp` crate

- 状态：⏳ Proposed（2026-06-03）
- 关联：[`0004-ai-agent-host-mcp-acp.md`](0004-ai-agent-host-mcp-acp.md) · [`0007-ai-as-edit-command.md`](0007-ai-as-edit-command.md) · 任务 [`0018`](../progress/tasks/0018-agent-host-proc-spike.md)

## Context

ADR-0004 锁定 Glyph 做 **ACP 本地宿主 + MCP 客户端**。M4 落地前，联网核实 2026-06 的协议与生态现状，确定用官方库还是自研。

### 联网核实的事实（2026-06）
- **ACP** = JSON-RPC 2.0 over **stdio**，agent 作编辑器子进程；稳定版 **v1**。Zed（2025-08 引入）、JetBrains、Google 直接实现；**Claude Code / Codex 经适配器接入**（如 `claude-code-acp`，Apache 许可，包装 Claude Agent SDK → ACP JSON-RPC）。2026-01 Zed + JetBrains 合推 **ACP Agent Registry**。**VS Code 仍无原生 ACP**（仅社区扩展）——印证 ADR-0004「可占缺口」。**HTTP/远程传输尚是提案** → v1 仅本地 stdio（与 ADR-0004 一致）。
- **官方 Rust crate**：`agent-client-protocol`（+ `agent-client-protocol-schema`）在 crates.io，提供协议类型 + client builder（transport + init 握手）。
- **MCP 官方 Rust SDK**：`rmcp`（modelcontextprotocol/rust-sdk，tokio 异步，client + server，多传输）。

> 来源：[agentclientprotocol.com](https://agentclientprotocol.com/get-started/introduction) · [zed.dev/acp](https://zed.dev/acp) · [agent-client-protocol GitHub](https://github.com/agentclientprotocol/agent-client-protocol) · [crates.io/agent-client-protocol](https://crates.io/crates/agent-client-protocol) · [Claude Code via ACP（Zed blog）](https://zed.dev/blog/claude-code-via-acp) · [modelcontextprotocol/rust-sdk](https://github.com/modelcontextprotocol/rust-sdk)

## Options

1. **手写 JSON-RPC 实现 ACP/MCP**：完全自控，但重、易错、需自行追 spec churn。
2. **用官方 crate**：`agent-client-protocol`（ACP 宿主/客户端侧）+ `rmcp`（MCP 客户端），架在 `proc.rs`（0018）子进程底座上。
3. **只接 Claude Code 一家**：最快出 demo，但锁定单厂商，违背「中立宿主」护城河。

## Decision

采用 **Option 2**。
- **ACP 宿主**：用官方 `agent-client-protocol` crate 的 client 侧，复用 `proc.rs`（0018）spawn agent 子进程 + stdio；经适配器接 **Claude Code / Codex / Gemini CLI**（不锁单厂商，中立）。
- **MCP 客户端**：用官方 `rmcp` 连接 MCP server（tokio 异步）。
- **AI 形态**：遵 [ADR-0007](0007-ai-as-edit-command.md)——agent/工具产出经 diff 审查 + 权限提示落为编辑，不阻塞热路径。
- **安全一等公民**：`fs/write`、`terminal/*` 等敏感能力显式权限提示 + 沙箱（0018 已起权限骨架）。
- **范围**：v1 仅本地 stdio；HTTP/远程传输（ACP 提案中）留 v2。
- **Agent 发现**：对接 ACP Agent Registry 形态留 v2，v1 手动配置 agent 命令。

### 同行佐证
- **Zed**：`agent-client-protocol` crate 的主导者与生产用户（Claude Code/Codex/Gemini 并存）。
- **OpenCode / Kiro / JetBrains**：均按 ACP spec 实现，验证协议成熟度。
- **rmcp**：MCP 官方 Rust SDK，生产级。

## Consequences

- ✅ 对齐官方 spec、省自研维护、随 crate 升级跟进 spec；复用 0018 的 proc.rs 子进程 + 推送地基。
- ✅ 中立宿主：任何 ACP agent 都能插进来，零模型开销（billing/法务在用户与 agent 厂商之间）。
- ⚠️ crate 年轻（ACP `agent-client-protocol` 0.x、`rmcp` 0.12，版本会动）→ 适配层隔离，变更局部化。
- ⚠️ **端到端验证需安装真实 agent CLI（如 Claude Code）+ 运行 app**——headless/CI 编译可验，行为验证需显示环境 + 凭据。
- ⚠️ tokio 引入会增体积/编译时间 → 评估是否必要（rmcp 依赖 tokio；ACP client 可能也异步）。
- 📝 diff 审查 UI、权限提示 UI、provider/agent 配置的具体形态随实现细化。

## v1 实现说明（2026-06-03，见任务 [0024](../progress/tasks/0024-acp-mcp-client-foundation.md)）

首刀因**「轻」SLO** 暂未用官方 crate:官方 `agent-client-protocol` 重度依赖 **tokio**,会显著增体积/编译时间(本 ADR Consequences 已预警)。故 v1 走**轻量自研最小 ACP 客户端**(仅 `serde_json`,复用 proc.rs std 子进程,ndjson JSON-RPC),一次性 prompt 取文本,纯消息层 cargo 可测。**待功能复杂化(流式会话保活/fs/terminal/权限/MCP)再评估切官方 crate**——本 ADR 的「用官方 crate」决定不变,只是 v1 先以轻量实现验证形态。
