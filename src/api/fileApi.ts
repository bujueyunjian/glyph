import { call } from "./ipc";

// 文件读写命令封装。对应 Rust commands/file.rs。
// 路径选择由调用方用 @tauri-apps/plugin-dialog 完成,这里只负责读写内容。

export function openFile(path: string): Promise<string> {
  return call<string>("open_file", { path });
}

export function saveFile(path: string, content: string): Promise<void> {
  return call<void>("save_file", { path, content });
}

// 文件树增删改。对应 Rust commands/file.rs。
export function createFile(path: string): Promise<void> {
  return call<void>("create_file", { path });
}

export function createDir(path: string): Promise<void> {
  return call<void>("create_dir", { path });
}

export function renamePath(from: string, to: string): Promise<void> {
  return call<void>("rename_path", { from, to });
}

export function deletePath(path: string): Promise<void> {
  return call<void>("delete_path", { path });
}
