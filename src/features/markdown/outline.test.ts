import { describe, expect, it } from "vitest";

import { markdownHeadings } from "./outline";

describe("markdownHeadings", () => {
  it("解析各级 ATX 标题(name/line/depth)", () => {
    const text = ["# 标题", "正文", "## 二级", "### 三级 ###"].join("\n");
    expect(markdownHeadings(text)).toEqual([
      { name: "标题", line: 0, depth: 0 },
      { name: "二级", line: 2, depth: 1 },
      { name: "三级", line: 3, depth: 2 },
    ]);
  });

  it("跳过围栏代码块内的 #;无空格的 # 不算标题", () => {
    const text = [
      "# Real",
      "```",
      "# not a heading",
      "```",
      "#nospace",
      "## After",
    ].join("\n");
    expect(markdownHeadings(text)).toEqual([
      { name: "Real", line: 0, depth: 0 },
      { name: "After", line: 5, depth: 1 },
    ]);
  });

  it("无标题/空文本返回空", () => {
    expect(markdownHeadings("just text\nno headings")).toEqual([]);
    expect(markdownHeadings("")).toEqual([]);
  });
});
