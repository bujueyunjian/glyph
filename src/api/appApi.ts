import type { AppInfo } from "@/types/appTypes";
import { call } from "./ipc";

// 应用级命令封装。对应 Rust commands/app.rs。
export function getAppInfo(): Promise<AppInfo> {
  return call<AppInfo>("get_app_info");
}
