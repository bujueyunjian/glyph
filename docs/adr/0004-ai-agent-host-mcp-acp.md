# ADR-0004：AI 定位为"agent 宿主"，押注 MCP（客户端）+ ACP（宿主）

- 状态：✅ Accepted（2026-06-02）
- 关联：[`../research/03-ai-agents.md`](../research/03-ai-agents.md) · [`../architecture/ai-agent-architecture.md`](../architecture/ai-agent-architecture.md)

## Context

2026 年 in-editor AI（补全/改写/agent）已完全商品化，硬刚 Cursor/Windsurf 是烧钱必输的偏题。利益相关方要在"agent 时代"想清楚 AI 选型，但**明确不偏离"先是一个极好的编辑器"主线、不臃肿**。

## Options

1. **自建/对标 Cursor/Windsurf**：自有补全模型 + 云后台 agent 集群 + 捆绑 key。
2. **编辑器优先 + agent 宿主**：薄层 in-editor AI（BYO-key）+ 一等 MCP 客户端 + 一等 ACP 本地宿主。
3. **v1 不做 AI**：先打磨编辑器本体。

## Decision

采用 **Option 2**。定位「最快、任何 agent 都能插进来的编辑器」。
- v1：薄层 in-editor AI（ghost-text 补全 + 行内改写 + 聊天，BYO-key/本地模型友好）+ **MCP 客户端** + **ACP 本地子进程宿主**（Claude Code/Codex/Copilot CLI）。
- 不自建模型、不绑 key、不做云 agent 集群。

### 依据
- **战略红利**：Zed 已证明编辑器与外部 agent 交互纯 UI 层，**billing/法务在用户与 agent 厂商之间** → 我们零模型开销、零 ToS 暴露。
- **押开放标准**：MCP（Linux 基金会治理，1 万+ server）+ ACP（"agent 界 LSP"，Zed+JetBrains 主导，Claude Code/Codex/Copilot CLI 已接入）。两者互补。
- **可占缺口**：VS Code 仅社区 ACP 扩展，无原生支持。

### 同行佐证
- **Zed**：原生 in-editor AI + ACP 外部 agent 宿主的成功范例。
- **Continue.dev**：BYO-key + 按角色多 provider 路由的开源范式。

## Consequences

- ✅ 差异化锋利且**资本极轻**（无前沿模型开销）。
- ⚠️ v1「ACP 宿主」= 仅本地 stdio 子进程；**远程/云 agent 留 v2**（ACP 远程传输 spec 尚缺席）。
- ⚠️ spec churn：MCP（2025-11-25，有 2026-07 RC）、ACP 年轻 → client 适配层隔离，变更局部化。
- ⚠️ 安全：ACP `fs/write`、`terminal/*` 需显式权限提示 + 沙箱，一等公民。
- ⚠️ 自我商品化风险（价值都在外部 agent）→ 靠原生速度 + in-editor AI 的 UX（diff 审查/上下文/延迟）拉开差距。
- 🔴 红线：**绝不在打字热路径阻塞网络/agent 调用**；编辑预测小且异步。
