import { describe, expect, it } from "vitest";

import { countText } from "./textStats";

describe("countText", () => {
  it("统计字数/字符/行", () => {
    expect(countText("hello world")).toEqual({ words: 2, chars: 11, lines: 1 });
  });

  it("多行与多空白归一", () => {
    expect(countText("a  b\nc")).toEqual({ words: 3, chars: 6, lines: 2 });
  });

  it("空文本:0 字、1 行", () => {
    expect(countText("")).toEqual({ words: 0, chars: 0, lines: 1 });
  });

  it("仅空白:0 字", () => {
    expect(countText("   \n  ").words).toBe(0);
  });
});
