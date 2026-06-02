# 调研 · AI 能力与 Agent 宿主

- 状态：✅ 完成（2026-06-02）· 已过 AI/协议专项对抗式核查
- 决策固化于 [`../adr/0004-ai-agent-host-mcp-acp.md`](../adr/0004-ai-agent-host-mcp-acp.md)

## 核心判断：两层市场，押第二层

- **第一层 · in-editor AI**（行内补全/改写/聊天/agentic 多文件 diff）：**已完全商品化**。Cursor/Windsurf/Copilot/Zed/Continue 都有。硬刚 = 烧钱必输 + 臃肿。
- **第二层 · 做 agent 的宿主/客户端**：**真正的、可持续的差异化所在**，且正快速收敛到两个互补的开放标准。

定位一句话：**「最快、任何 agent 都能插进来的编辑器」**，而不是"又一个 agent"。

## 两个要押的开放标准

### MCP（Model Context Protocol）—— 做客户端
- agent↔工具/数据/上下文 的标准。2025-12 捐给 **Linux 基金会 Agentic AI Foundation**（Anthropic/Block/OpenAI 共建，Google/MS/AWS/Cloudflare 支持）。
- ~1 万+ 公共 server、SDK 月下载 ~97M；ChatGPT/Claude/Cursor/Gemini/Copilot/VS Code 一等支持。当前 spec `2025-11-25`（注：2026-07-28 已有 RC，需跟踪 spec churn）。

### ACP（Agent Client Protocol）—— 做宿主（client 侧）
- "agent 界的 LSP"。JSON-RPC 2.0 over stdio，本地 agent 作编辑器子进程。
- agent 方法：`initialize / authenticate / session/new / session/prompt / session/load / session/set_mode / session/cancel`。
- **client（编辑器）方法**：`session/request_permission / fs/read_text_file / fs/write_text_file / terminal/* / session/update`（流式进度）。复用 MCP 的 JSON 类型，另加 diff 等 agentic-UX 类型。
- 势头：Zed + JetBrains 主导，Gemini CLI 参考实现；2026-01 推出 **ACP Registry**（实现一次，到处可用），列有 **Claude Code / Codex CLI / GitHub Copilot CLI / OpenCode / Gemini CLI**；2026-03 已 25+ agent 支持。**JetBrains 2025.3+ 原生支持；VS Code 仅社区扩展**（→ 新编辑器可占的缺口）。
- **MCP 与 ACP 互补**：MCP 连工具/数据，ACP 连编辑器；一个 agent 同时是"对 IDE 的 ACP server"与"对上下文的 MCP client"。**两个都押**。

## 战略要点（最承重的发现）

> Zed 文档原话：与外部 agent 的交互**纯 UI 层；billing、法务、条款都在用户与 agent 厂商之间**。编辑器只转发工作目录/环境变量/MCP server/模型与模式选择；agent 读自己的配置（`~/.claude`、`~/.codex`、`CLAUDE.md`）。

→ **托管 Claude Code/Codex 不需要我们任何前沿模型开销，也无 ToS 暴露**——一个战略上极便宜的差异化。
Claude Agent SDK（2025-09-29 由 Claude Code SDK 改名）与 Codex CLI（开源 Rust，~4M+ WAU）都设计为可被编辑器嵌入/驱动，且都在 ACP Registry——**我们只需做一个称职的 ACP client**。

## v1 范围（聚焦、反臃肿）

1. **原生快编辑器是产品本身**（不变护城河，AI 永不拖累它）。
2. **薄层 in-editor AI**（table-stakes）：ghost-text 编辑预测（小而快模型、延迟优先、可本地）+ 显式行内改写（带 diff 审批）+ 简单聊天面板（`@file/@selection/@terminal` 上下文）。保持薄。
3. **BYO-key + 多 provider 路由为默认**（Anthropic/OpenAI/Google + Ollama/llama.cpp 本地），按角色分配模型（补全 vs 聊天 vs 改写，仿 Continue.dev）。**不绑 key、不转售推理**。
4. **差异化核心**：一等 **MCP 客户端** + 一等 **ACP 宿主**，让 Claude Code/Codex/Copilot CLI 作子进程在编辑器内运行（权限提示、fs 读写、终端接管、流式 diff 渲染），接入 ACP Registry 保持更新。

**v2+**：远程/云 ACP agent、富上下文交接、可选微调本地编辑预测模型、企业隐私（ZDR provider 路由 / 离线 air-gapped 模式）、团队协作。

**明确 v1 不做**：自建/托管前沿模型、云后台 agent 集群（开 PR）、捆绑订阅 key、对标 Cursor/Windsurf 自治度。

## 风险

- **ACP 远程传输（HTTP/WS）在 spec 里基本缺席**（不是"WIP"，是"还没有"）→ v1「ACP 宿主」= 仅本地 stdio 子进程，不承诺远程托管。
- ACP 年轻、Zed/JetBrains 主导，spec 可能变 → 把 client 适配层隔离，变更局部化。
- "做好宿主"有自我商品化风险（价值都在外部 agent）→ 靠原生速度 + in-editor AI 的 UX（diff 审查、上下文铺设、延迟）拉开与终端/Electron 的差距。
- 延迟是轻量编辑器的全部卖点 → 编辑预测模型要小且异步，**绝不在打字热路径上阻塞网络/agent 调用**。
- MCP/agent 集成扩大攻击面（工具执行、fs/终端访问）→ 权限提示与沙箱必须一等公民，而非事后补。
