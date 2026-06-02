import type { DirEntry, WorkspaceFile } from "@/types/fsTypes";
import { call } from "./ipc";

// 工作区(文件夹)相关命令。对应 Rust commands/file.rs 的 list_dir。
// 逐级懒读:只列出 path 的直接子项,子目录展开时再调一次。
export function listDir(path: string): Promise<DirEntry[]> {
  return call<DirEntry[]>("list_dir", { path });
}

// 递归索引工作区文件(供 Goto Anything 模糊查找)。对应 Rust 的 list_files。
export function listFiles(root: string): Promise<WorkspaceFile[]> {
  return call<WorkspaceFile[]>("list_files", { root });
}
