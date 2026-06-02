// 文件树的一项。对应 Rust 的 `DirEntry`(commands/file.rs)。
export interface DirEntry {
  name: string;
  path: string;
  isDir: boolean;
}

// Goto Anything 的工作区文件项。对应 Rust 的 `WorkspaceFile`。
export interface WorkspaceFile {
  path: string;
  relativePath: string;
}
