// 文本统计(纯函数):字数 / 字符数 / 行数。用于"字数统计"命令(写作级 MD 辅助)。
export interface TextStats {
  words: number;
  chars: number;
  lines: number;
}

// CJK(中日韩)文字逐字计数:中文写作通常无空格,按空白分词会把整段算成 1 字。
const CJK =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu;

export function countText(text: string): TextStats {
  const trimmed = text.trim();
  const cjkCount = (trimmed.match(CJK) ?? []).length;
  // CJK 逐字计;其余(西文等)抠掉 CJK 后按空白分词。
  const rest = trimmed.replace(CJK, " ").trim();
  const latinWords = rest === "" ? 0 : rest.split(/\s+/).length;
  return {
    words: cjkCount + latinWords,
    chars: text.length,
    lines: text.split("\n").length,
  };
}
