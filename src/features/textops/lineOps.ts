// 行变换纯函数(文本力量)。作用于一段文本(选区或整篇),保留尾随换行。
// 纯字符串处理,不依赖 DOM / CodeMirror,可独立单测。

// 逐行施加 fn,保留尾随换行(末尾空行不参与映射)。
function mapLines(text: string, fn: (line: string) => string): string {
  const trailing = text.endsWith("\n");
  const body = trailing ? text.slice(0, -1) : text;
  const mapped = body.split("\n").map(fn).join("\n");
  return trailing ? mapped + "\n" : mapped;
}

// 对整组行施加 fn(排序/去重),保留尾随换行。
function mapBlock(text: string, fn: (lines: string[]) => string[]): string {
  const trailing = text.endsWith("\n");
  const body = trailing ? text.slice(0, -1) : text;
  const result = fn(body.split("\n")).join("\n");
  return trailing ? result + "\n" : result;
}

/** 去除每行行尾的空格与制表符。 */
export function trimLineEnds(text: string): string {
  return mapLines(text, (line) => line.replace(/[ \t]+$/, ""));
}

/** 按字典序升序排序行。 */
export function sortLines(text: string): string {
  return mapBlock(text, (lines) => [...lines].sort());
}

/** 去除重复行,保留首次出现的顺序。 */
export function dedupeLines(text: string): string {
  return mapBlock(text, (lines) => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const line of lines) {
      if (!seen.has(line)) {
        seen.add(line);
        out.push(line);
      }
    }
    return out;
  });
}

/** 转为大写。 */
export function toUpperCase(text: string): string {
  return text.toUpperCase();
}

/** 转为小写。 */
export function toLowerCase(text: string): string {
  return text.toLowerCase();
}

/** 每行加前缀。 */
export function addPrefix(text: string, prefix: string): string {
  return mapLines(text, (line) => prefix + line);
}

/** 每行加后缀。 */
export function addSuffix(text: string, suffix: string): string {
  return mapLines(text, (line) => line + suffix);
}

/** 每行加前后缀(包裹)。 */
export function wrapLines(
  text: string,
  prefix: string,
  suffix: string,
): string {
  return mapLines(text, (line) => prefix + line + suffix);
}

export interface LineSpan {
  from: number;
  to: number;
}

// 合并重叠/相邻区间(多选区行变换用,保证 dispatch 的 changes 互不重叠)。
export function mergeSpans(spans: LineSpan[]): LineSpan[] {
  const sorted = [...spans].sort((a, b) => a.from - b.from);
  const out: LineSpan[] = [];
  for (const span of sorted) {
    const last = out[out.length - 1];
    if (last && span.from <= last.to) {
      last.to = Math.max(last.to, span.to);
    } else {
      out.push({ from: span.from, to: span.to });
    }
  }
  return out;
}
