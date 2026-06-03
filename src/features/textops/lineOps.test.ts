import { describe, expect, it } from "vitest";

import {
  addPrefix,
  addSuffix,
  dedupeLines,
  sortLines,
  toLowerCase,
  toUpperCase,
  trimLineEnds,
} from "@/features/textops/lineOps";

describe("trimLineEnds", () => {
  it("去除每行行尾空格/制表符", () => {
    expect(trimLineEnds("a  \nb\t\nc")).toBe("a\nb\nc");
  });
  it("保留尾随换行", () => {
    expect(trimLineEnds("a  \n")).toBe("a\n");
  });
});

describe("sortLines", () => {
  it("升序排序", () => {
    expect(sortLines("b\na\nc")).toBe("a\nb\nc");
  });
  it("保留尾随换行", () => {
    expect(sortLines("b\na\n")).toBe("a\nb\n");
  });
});

describe("dedupeLines", () => {
  it("去重并保留首次出现顺序", () => {
    expect(dedupeLines("a\nb\na\nc\nb")).toBe("a\nb\nc");
  });
});

describe("大小写", () => {
  it("转大写 / 转小写", () => {
    expect(toUpperCase("aB")).toBe("AB");
    expect(toLowerCase("aB")).toBe("ab");
  });
});

describe("前缀 / 后缀", () => {
  it("每行加前缀", () => {
    expect(addPrefix("a\nb", "> ")).toBe("> a\n> b");
  });
  it("每行加后缀,且不加到尾随换行的空行", () => {
    expect(addSuffix("a\nb\n", ";")).toBe("a;\nb;\n");
  });
});
