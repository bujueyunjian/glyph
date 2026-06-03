import { describe, expect, it } from "vitest";

import { formatJson, minifyJson } from "./json";

describe("formatJson", () => {
  it("美化:缩进 2 空格", () => {
    expect(formatJson('{"a":1}')).toBe('{\n  "a": 1\n}');
  });

  it("坏 JSON 抛错(失败响亮,不兜底)", () => {
    expect(() => formatJson("{bad}")).toThrow();
  });
});

describe("minifyJson", () => {
  it("压缩:去空白", () => {
    expect(minifyJson('{\n  "a": 1\n}')).toBe('{"a":1}');
  });

  it("坏 JSON 抛错", () => {
    expect(() => minifyJson("nope")).toThrow();
  });
});
