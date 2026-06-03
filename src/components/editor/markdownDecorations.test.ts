import { EditorState } from "@codemirror/state";
import { ensureSyntaxTree } from "@codemirror/language";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { describe, expect, it } from "vitest";

import {
  buildConcealDecorations,
  buildMarkdownDecorations,
} from "./markdownDecorations";

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

// 统计某文档在给定光标行下被隐藏(replace)的标记数。
function concealCount(doc: string, cursorLines: number[]): number {
  const state = EditorState.create({
    doc,
    extensions: [markdown({ base: markdownLanguage })],
  });
  ensureSyntaxTree(state, doc.length, 5000);
  const set = buildConcealDecorations(
    state,
    [{ from: 0, to: doc.length }],
    new Set(cursorLines),
  );
  let count = 0;
  const cursor = set.iter();
  while (cursor.value) {
    count += 1;
    cursor.next();
  }
  return count;
}

describe("buildConcealDecorations", () => {
  it("非光标行隐藏语法标记(**bold** 的 ** 被隐藏)", () => {
    expect(concealCount("**bold**", [])).toBeGreaterThan(0);
  });

  it("光标所在行不隐藏,保留原始标记可编辑", () => {
    expect(concealCount("**bold**", [1])).toBe(0);
  });

  it("多行:仅隐藏非光标行的标记", () => {
    const doc = "**a**\n**b**";
    const all = concealCount(doc, []);
    const line1Focused = concealCount(doc, [1]);
    expect(all).toBeGreaterThan(0);
    expect(line1Focused).toBeGreaterThan(0); // 第 2 行仍隐藏
    expect(line1Focused).toBeLessThan(all); // 第 1 行已揭示
  });

  it("纯文本无标记可隐藏", () => {
    expect(concealCount("plain prose", [])).toBe(0);
  });
});
