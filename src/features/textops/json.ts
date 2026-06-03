// JSON 美化 / 压缩(纯函数)。坏 JSON 直接抛错 —— 失败响亮,由命令层转红 toast,
// 绝不静默返回原文兜底(遵守 no-fallback 铁律)。
export function formatJson(text: string, indent = 2): string {
  return JSON.stringify(JSON.parse(text), null, indent);
}

export function minifyJson(text: string): string {
  return JSON.stringify(JSON.parse(text));
}
