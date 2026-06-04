import { call } from "./ipc";

// ACP agent 调用封装。对应 Rust agent.rs。
// agentCmd 为用户已装的 ACP 适配器命令(如 "claude-agent-acp")。

export function agentOneshot(
  agentCmd: string,
  prompt: string,
): Promise<string> {
  return call<string>("agent_oneshot", { agentCmd, prompt });
}

// 流式提问:turnId 由前端分配,用于事件过滤与取消(见 App 的 agent 监听)。
// 响应分块经 `agent://chunk`(带 turnId)回流;命令即时返回,不阻塞。
export function agentStream(
  agentCmd: string,
  prompt: string,
  turnId: number,
): Promise<null> {
  return call<null>("agent_stream", { agentCmd, prompt, turnId });
}

// 取消进行中的流式会话:终止并回收其子进程(关闭对话框/开新会话时调用)。
export function agentCancel(turnId: number): Promise<null> {
  return call<null>("agent_cancel", { turnId });
}
