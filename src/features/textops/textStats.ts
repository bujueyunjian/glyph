// 文本统计(纯函数):字数 / 字符数 / 行数。用于"字数统计"命令(写作级 MD 辅助)。
export interface TextStats {
  words: number;
  chars: number;
  lines: number;
}

export function countText(text: string): TextStats {
  const trimmed = text.trim();
  return {
    words: trimmed === "" ? 0 : trimmed.split(/\s+/).length,
    chars: text.length,
    lines: text.split("\n").length,
  };
}
