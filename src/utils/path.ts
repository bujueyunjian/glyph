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
