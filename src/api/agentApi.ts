import { call } from "./ipc";

// ACP agent 调用封装。对应 Rust agent.rs。
// agentCmd 为用户已装的 ACP 适配器命令(如 "claude-agent-acp")。
export function agentOneshot(
  agentCmd: string,
  prompt: string,
): Promise<string> {
  return call<string>("agent_oneshot", { agentCmd, prompt });
}
