import { listen } from "@tauri-apps/api/event";

import { call } from "./ipc";

// ACP agent 调用封装。对应 Rust agent.rs。
// agentCmd 为用户已装的 ACP 适配器命令(如 "claude-agent-acp")。
export function agentOneshot(
  agentCmd: string,
  prompt: string,
): Promise<string> {
  return call<string>("agent_oneshot", { agentCmd, prompt });
}

export interface AgentStreamHandlers {
  onChunk: (text: string) => void;
  onDone: () => void;
  onError: (message: string) => void;
}

// 流式调用 ACP agent:订阅 `agent://chunk/done/error` 事件后触发后台会话。
// 返回清理函数(解绑监听);调用方在 done/error 或关闭时务必调用,避免监听泄漏。
export async function agentStream(
  agentCmd: string,
  prompt: string,
  handlers: AgentStreamHandlers,
): Promise<() => void> {
  const unlisteners = await Promise.all([
    listen<string>("agent://chunk", (event) => handlers.onChunk(event.payload)),
    listen("agent://done", () => handlers.onDone()),
    listen<string>("agent://error", (event) => handlers.onError(event.payload)),
  ]);
  const cleanup = () => unlisteners.forEach((unlisten) => unlisten());
  try {
    await call<null>("agent_stream", { agentCmd, prompt });
  } catch (err) {
    cleanup();
    throw err;
  }
  return cleanup;
}
