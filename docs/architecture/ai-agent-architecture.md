# AI 与 Agent 宿主架构

- 状态：📝 大纲（2026-06-02）—— v1 落 in-editor AI 薄层 + MCP 客户端 + ACP 本地宿主
- 决策见 [`../adr/0004-ai-agent-host-mcp-acp.md`](../adr/0004-ai-agent-host-mcp-acp.md)；论据见 [`../research/03-ai-agents.md`](../research/03-ai-agents.md)

---

## 定位

**「最快、任何 agent 都能插进来的编辑器」**。不自建大模型、不绑 key、不做云 agent 集群。

## 三层能力

### 1. in-editor AI（薄层，table-stakes）
- ghost-text 编辑预测（小而快模型，延迟优先，可本地 Ollama）。
- 显式行内改写（自然语言 → diff 审批）。
- 聊天面板（`@file / @selection / @terminal` 上下文）。
- **BYO-key + 多 provider 路由**为默认，按角色分配模型（补全/聊天/改写）。

### 2. MCP 客户端
- 连接 MCP server 获取工具/数据/上下文。spec 跟踪 `2025-11-25`（注意 2026-07-28 RC）。
- 把 client 适配层隔离，spec churn 局部化。

### 3. ACP 宿主（client 侧，差异化核心）
- 让 Claude Code / Codex CLI / Copilot CLI 作**本地子进程**在编辑器内运行。
- **我们要实现的 client 方法**：`session/request_permission`、`fs/read_text_file`、`fs/write_text_file`、`terminal/*`、`session/update`（流式渲染进度/diff）。
- 转发：工作目录、环境变量、MCP server、模型/模式选择；agent 读自己的配置（`~/.claude`、`~/.codex`、`CLAUDE.md`）。
- **战略红利**：交互纯 UI 层，billing/法务在用户与 agent 厂商之间 → **零模型开销、零 ToS 暴露**。
- 接入 ACP Registry 保持 agent 列表更新。

## 进程与数据流

```
UI(agent 面板/diff 审批/权限提示)
   ▲  ▼  session/update, request_permission
Rust agent 模块（agent/）
   │  spawn + stdio (JSON-RPC 2.0)
   ▼
ACP agent 子进程（Claude Code / Codex / Copilot CLI）
   │  自身作为 MCP client 连接
   ▼
MCP servers（工具/数据）
```

## 安全（一等公民，非事后补）
- ACP 的 `fs/write` 与 `terminal/*` 必须有**显式权限提示 + 沙箱**。
- 与插件 capability 模型、Tauri 2 capability 安全模型统一。
- 攻击面扩大（工具执行、fs/终端访问）是已知风险，权限 UI 从一开始就在。

## 红线
- **绝不在打字热路径上阻塞网络/agent 调用**；编辑预测小且异步。
- v1「ACP 宿主」= 仅本地 stdio 子进程；**远程/云 agent 留 v2**（ACP 远程传输 spec 尚缺席）。

## v1 / v2 切分
| 能力 | v1 | v2+ |
|---|---|---|
| ghost-text 补全 / 行内改写 / 聊天 | ✅ | —— |
| BYO-key 多 provider + 本地模型 | ✅ | —— |
| MCP 客户端 | ✅ | —— |
| ACP 本地子进程宿主 | ✅ | —— |
| 远程/云 ACP agent | ❌ | ⏳ |
| 微调本地编辑预测模型 | ❌ | ⏳ |
| 企业隐私（ZDR 路由 / air-gapped） | ❌ | ⏳ |

> 待办：ACP client 方法实现清单、权限提示 UX、provider 路由配置 schema、MCP client 适配层接口。
