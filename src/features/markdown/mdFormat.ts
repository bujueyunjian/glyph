// Markdown 行内/行级格式化的纯函数。命令面板触发,作用于选区文本(不碰打字热路径)。
// 均为「切换」语义:已是该格式则去除,否则添加——一个命令兼顾加/减。

// 行内环绕切换:选区已被 marker 前后包裹则去除,否则添加(粗体 **、斜体 *、行内码 `、删除线 ~~)。
export function toggleWrap(text: string, marker: string): string {
  const wrapped =
    text.length >= marker.length * 2 &&
    text.startsWith(marker) &&
    text.endsWith(marker);
  return wrapped
    ? text.slice(marker.length, text.length - marker.length)
    : `${marker}${text}${marker}`;
}

// 行级前缀切换:选区每一行都已有该前缀则整体去除,否则逐行添加(标题 "# "、引用 "> "、无序列表 "- ")。
export function toggleLinePrefix(text: string, prefix: string): string {
  const lines = text.split("\n");
  const allHave = lines.every((line) => line.startsWith(prefix));
  return lines
    .map((line) => (allHave ? line.slice(prefix.length) : `${prefix}${line}`))
    .join("\n");
}

// 有序列表切换:逐行加 "1. " "2. " …;全部已为编号则去除。
export function toggleOrderedList(text: string): string {
  const lines = text.split("\n");
  const numbered = /^\d+\.\s/;
  const allHave = lines.every((line) => numbered.test(line));
  return lines
    .map((line, index) =>
      allHave ? line.replace(numbered, "") : `${index + 1}. ${line}`,
    )
    .join("\n");
}
