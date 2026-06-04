import { call } from "./ipc";

// LSP 客户端命令封装。对应 Rust lsp.rs(协议在 Rust 跑,前端只驱动与渲染)。

// 启动语言服务器并完成 initialize 握手,返回服务器 id(失败 reject)。
export function lspStart(
  program: string,
  args: string[],
  rootUri: string,
): Promise<number> {
  return call<number>("lsp_start", { program, args, rootUri });
}

// 发一条带响应的请求(completion/hover 等)。
export function lspRequest(
  id: number,
  method: string,
  params: unknown,
): Promise<unknown> {
  return call<unknown>("lsp_request", { id, method, params });
}

// 发一条无响应的通知(didOpen/didChange 等,已序列化的 JSON-RPC 字符串)。
export function lspSend(id: number, message: string): Promise<null> {
  return call<null>("lsp_send", { id, message });
}

// 终止并回收语言服务器。
export function lspStop(id: number): Promise<null> {
  return call<null>("lsp_stop", { id });
}
