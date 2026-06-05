import { call } from "./ipc";
import type { McpServer } from "@/features/agent/mcpConfig";

// ACP agent 调用封装。对应 Rust agent.rs。
// agentCmd 为用户已装的 ACP 适配器命令(如 "claude-code-acp")。
// mcpServers 转发给 agent,由 agent 连接对应 MCP server(见 ADR-0010)。

export function agentOneshot(
  agentCmd: string,
  prompt: string,
  cwd: string | null,
  mcpServers: McpServer[],
): Promise<string> {
  return call<string>("agent_oneshot", { agentCmd, prompt, cwd, mcpServers });
}

// 流式提问:turnId 由前端分配,用于事件过滤与取消(见 App 的 agent 监听)。
// 响应分块经 `agent://chunk`(带 turnId)回流;命令即时返回,不阻塞。
// cwd 为打开的工作区根:把 agent 默认作用域收敛到用户打开的工程(数据安全,见 ADR-0009)。
export function agentStream(
  agentCmd: string,
  prompt: string,
  turnId: number,
  cwd: string | null,
  mcpServers: McpServer[],
): Promise<null> {
  return call<null>("agent_stream", {
    agentCmd,
    prompt,
    turnId,
    cwd,
    mcpServers,
  });
}

// 取消进行中的流式会话:终止并回收其子进程(关闭对话框/开新会话时调用)。
export function agentCancel(turnId: number): Promise<null> {
  return call<null>("agent_cancel", { turnId });
}
