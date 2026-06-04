import type { OutlineSymbol } from "@/features/lsp/protocol";

// 从 Markdown 文本解析 ATX 标题(# ~ ######)生成大纲项,供大纲面板复用(无需 LSP)。
// depth = 标题级数 - 1(h1→0)供缩进;跳过围栏代码块(``` / ~~~)内的 #,避免把代码注释当标题。
export function markdownHeadings(text: string): OutlineSymbol[] {
  const out: OutlineSymbol[] = [];
  const lines = text.split("\n");
  let fenceMarker = "";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = line.match(/^\s*(```+|~~~+)/);
    if (fence) {
      const marker = fence[1][0];
      if (fenceMarker === "") fenceMarker = marker;
      else if (marker === fenceMarker) fenceMarker = "";
      continue;
    }
    if (fenceMarker !== "") continue;
    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      out.push({
        name: heading[2].trim(),
        line: i,
        depth: heading[1].length - 1,
      });
    }
  }
  return out;
}
