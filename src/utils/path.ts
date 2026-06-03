// 路径工具(跨平台,兼容 / 与 \ 分隔符)。

/** 取文件名(含扩展名),如 "/a/b/main.rs" → "main.rs"。 */
export function getFileName(path: string): string {
  const segments = path.split(/[\\/]/);
  return segments[segments.length - 1] || path;
}

/** 取小写扩展名(不含点),如 "main.rs" → "rs";无扩展名返回空串。 */
export function getFileExtension(path: string): string {
  const name = getFileName(path);
  const dotIndex = name.lastIndexOf(".");
  if (dotIndex <= 0) return "";
  return name.slice(dotIndex + 1).toLowerCase();
}

/** 取父目录路径,如 "/a/b/c.txt" → "/a/b";无父级返回空串。兼容 / 与 \。 */
export function getDirName(path: string): string {
  const idx = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return idx <= 0 ? "" : path.slice(0, idx);
}

/** 拼接目录与名称(统一用 / 分隔,Rust 侧跨平台可接受)。 */
export function joinPath(dir: string, name: string): string {
  return `${dir}/${name}`;
}
