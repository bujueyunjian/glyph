import { Text } from "@codemirror/state";
import { describe, expect, it } from "vitest";

import {
  definitionTarget,
  hoverText,
  offsetToPosition,
  positionToOffset,
  toCmCompletions,
  toCmDiagnostics,
} from "./protocol";

const doc = Text.of(["fn main() {", "    let x = 1;", "}"]);

describe("offsetToPosition / positionToOffset", () => {
  it("行首偏移 ↔ 0 基行/0 列", () => {
    // 第 2 行起始偏移(line 1, char 0)
    const off = doc.line(2).from;
    expect(offsetToPosition(doc, off)).toEqual({ line: 1, character: 0 });
    expect(positionToOffset(doc, { line: 1, character: 0 })).toBe(off);
  });

  it("行内偏移往返一致", () => {
    const off = doc.line(2).from + 6; // 第 2 行第 6 列
    const pos = offsetToPosition(doc, off);
    expect(pos).toEqual({ line: 1, character: 6 });
    expect(positionToOffset(doc, pos)).toBe(off);
  });

  it("越界位置钳到合法范围(坏位置不炸)", () => {
    expect(positionToOffset(doc, { line: 999, character: 999 })).toBe(
      doc.length,
    );
    expect(positionToOffset(doc, { line: 1, character: 999 })).toBe(
      doc.line(2).to,
    );
  });
});

describe("toCmCompletions", () => {
  it("CompletionList{items} 映射 label/type/detail", () => {
    const result = {
      items: [
        { label: "println!", kind: 3, detail: "macro" },
        { label: "push", kind: 2 },
        { label: 123 }, // 非法 label 跳过
      ],
    };
    const out = toCmCompletions(result);
    expect(out).toEqual([
      { label: "println!", type: "function", detail: "macro" },
      { label: "push", type: "method" },
    ]);
  });

  it("裸数组与 null 都安全", () => {
    expect(toCmCompletions([{ label: "x" }])).toEqual([{ label: "x" }]);
    expect(toCmCompletions(null)).toEqual([]);
  });
});

describe("toCmDiagnostics", () => {
  it("range 换算到偏移 + severity 映射", () => {
    const params = [
      {
        range: {
          start: { line: 1, character: 4 },
          end: { line: 1, character: 7 },
        },
        severity: 1,
        message: "mismatched types",
      },
    ];
    const out = toCmDiagnostics(params, doc);
    expect(out).toHaveLength(1);
    expect(out[0].severity).toBe("error");
    expect(out[0].message).toBe("mismatched types");
    expect(out[0].from).toBe(doc.line(2).from + 4);
    expect(out[0].to).toBe(doc.line(2).from + 7);
  });

  it("缺 range/message 的项跳过;非数组返回空", () => {
    expect(toCmDiagnostics([{ message: "no range" }], doc)).toEqual([]);
    expect(toCmDiagnostics(null, doc)).toEqual([]);
  });
});

describe("hoverText", () => {
  it("string / MarkupContent / MarkedString 数组", () => {
    expect(hoverText({ contents: "fn main()" })).toBe("fn main()");
    expect(hoverText({ contents: { kind: "markdown", value: "`i32`" } })).toBe(
      "`i32`",
    );
    expect(hoverText({ contents: [{ value: "a" }, "b"] })).toBe("a\n\nb");
  });

  it("空/缺内容返回 null", () => {
    expect(hoverText(null)).toBeNull();
    expect(hoverText({ contents: "  " })).toBeNull();
    expect(hoverText({})).toBeNull();
  });
});

describe("definitionTarget", () => {
  it("Location:uri 去 file:// + 取 range.start", () => {
    const r = {
      uri: "file:///work/src/lib.rs",
      range: { start: { line: 9, character: 4 } },
    };
    expect(definitionTarget(r)).toEqual({
      path: "/work/src/lib.rs",
      line: 9,
      character: 4,
    });
  });

  it("LocationLink 数组:取首个 targetUri + targetSelectionRange", () => {
    const r = [
      {
        targetUri: "file:///work/a.rs",
        targetSelectionRange: { start: { line: 1, character: 0 } },
      },
    ];
    expect(definitionTarget(r)).toEqual({
      path: "/work/a.rs",
      line: 1,
      character: 0,
    });
  });

  it("空/非法返回 null", () => {
    expect(definitionTarget(null)).toBeNull();
    expect(definitionTarget([])).toBeNull();
    expect(definitionTarget({ uri: "file:///x" })).toBeNull();
  });
});
