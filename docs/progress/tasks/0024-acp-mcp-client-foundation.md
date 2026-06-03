# 任务 0024：ACP / MCP 客户端地基（M4 Agent 宿主）

- 状态：⏳ 计划中（实现需显示环境 + 已装 agent CLI 才能端到端验证）
- 里程碑：M4 · 关联任务：—（TaskList）· 负责人：待定
- 开工：—— · 收工：——

> 规范见 [`../../workflow/doc-driven-workflow.md`](../../workflow/doc-driven-workflow.md)。依据 [ADR-0008](../../adr/0008-agent-host-implementation.md)。

---

## Plan（开工前）

### 背景 / 目标
在 `proc.rs`（0018）子进程地基上，用官方 `agent-client-protocol`（ACP）+ `rmcp`（MCP）crate 实现「最快、任何 agent 都能插进来的编辑器」的客户端地基：spawn 一个 ACP agent（如 Claude Code 适配器）并完成 initialize 握手 + 一轮 prompt/响应流。

### 范围 / 非范围
- 范围（首刀）：加 `agent-client-protocol` + `rmcp` 依赖；Rust ACP client 模块（spawn + initialize 握手 + session 基本消息流，经事件推 UI）；前端最小聊天面板（发 prompt、看流式响应）。
- 非范围（后续）：diff 审查 UI、权限提示完整 UX、终端接管、provider 路由、MCP server 完整接入、ACP Agent Registry、HTTP/远程传输（v2）。

### 方案大纲
- 复用 `proc.rs` spawn + stdio；用 `agent-client-protocol` client builder 跑 ACP 握手与会话（JSON-RPC over stdio）。
- 适配器命令可配置（v1 手动配 agent 启动命令，如 `claude-agent-acp`）。
- 安全：`fs/write`、`terminal/*` 经权限提示（0018 骨架）。
- 形态遵 ADR-0007（AI = 返回编辑/产物的命令）。

### 验证计划
- [ ] cargo：ACP 消息类型 / 握手逻辑可编译 + 单测（用 stub agent）
- [ ] `pnpm check` 全绿
- [ ] **端到端**：本地装 Claude Code（或 ACP stub），`pnpm tauri:dev` 实跑握手 + 一轮对话——**需显示环境 + agent CLI**

### 风险与对策
- crate 年轻（ACP 0.x / rmcp 0.12）→ 适配层隔离 spec churn。
- tokio 引入增体积/编译 → 评估必要性。
- 端到端依赖外部 agent CLI + 运行 app → headless 只能编译验证；行为验证交显示环境。

---

## Outcome（收工后）
<待开工>
