import { EditorState } from "@codemirror/state";
import { ensureSyntaxTree } from "@codemirror/language";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { describe, expect, it } from "vitest";

import { buildMarkdownDecorations } from "./markdownDecorations";

// 在完整解析的 markdown 文档上构建装饰,导出 {from,to,cls} 列表便于断言。
function decorationsFor(doc: string): { cls: string }[] {
  const state = EditorState.create({
    doc,
    extensions: [markdown({ base: markdownLanguage })],
  });
  ensureSyntaxTree(state, doc.length, 5000);
  const set = buildMarkdownDecorations(state, [{ from: 0, to: doc.length }]);
  const out: { cls: string }[] = [];
  const cursor = set.iter();
  while (cursor.value) {
    out.push({ cls: (cursor.value.spec as { class: string }).class });
    cursor.next();
  }
  return out;
}

describe("buildMarkdownDecorations", () => {
  it("ATX 标题加对应层级类", () => {
    expect(decorationsFor("# Title").some((d) => d.cls === "cm-md-h1")).toBe(
      true,
    );
    expect(decorationsFor("## Sub").some((d) => d.cls === "cm-md-h2")).toBe(
      true,
    );
  });

  it("识别粗体/斜体/行内码", () => {
    const classes = decorationsFor("**b** *i* `c`").map((d) => d.cls);
    expect(classes).toContain("cm-md-strong");
    expect(classes).toContain("cm-md-em");
    expect(classes).toContain("cm-md-code");
  });

  it("识别 GFM 删除线", () => {
    expect(
      decorationsFor("~~gone~~").some((d) => d.cls === "cm-md-strike"),
    ).toBe(true);
  });

  it("纯文本不产生任何装饰", () => {
    expect(decorationsFor("just plain prose here")).toHaveLength(0);
  });
});
