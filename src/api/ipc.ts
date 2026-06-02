import { invoke } from "@tauri-apps/api/core";

// 统一的 Tauri command 封装(类比前端项目的 axios request 实例)。
// UI 一律走 call<T>(),绝不直接 invoke,以集中处理错误语义:
// Rust 的 Err(String) → invoke reject → 这里统一包成 Error,由上层弹红 toast。
//
// 错误二分见 docs/architecture/overview.md:
// - 预期内空态由各命令返回结构化 payload,不在此处特殊化;
// - 真实失败 → Err(String) → 抛 Error。
export async function call<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (err) {
    const message = typeof err === "string" ? err : String(err);
    throw new Error(message, { cause: err });
  }
}
