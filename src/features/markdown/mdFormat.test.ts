import { describe, expect, it } from "vitest";

import {
  toggleLinePrefix,
  toggleOrderedList,
  toggleTaskList,
  toggleWrap,
} from "./mdFormat";

describe("toggleWrap", () => {
  it("环绕未格式化的选区", () => {
    expect(toggleWrap("text", "**")).toBe("**text**");
    expect(toggleWrap("text", "`")).toBe("`text`");
  });

  it("去除已环绕的选区(再次切换)", () => {
    expect(toggleWrap("**text**", "**")).toBe("text");
    expect(toggleWrap("`code`", "`")).toBe("code");
  });

  it("空选区也成对插入标记", () => {
    expect(toggleWrap("", "**")).toBe("****");
  });

  it("两段相邻同标记不被误剥(*a* *b* → 再包一层,不破坏)", () => {
    expect(toggleWrap("*a* *b*", "*")).toBe("**a* *b**");
  });
});

describe("toggleLinePrefix", () => {
  it("逐行添加前缀", () => {
    expect(toggleLinePrefix("a\nb", "> ")).toBe("> a\n> b");
    expect(toggleLinePrefix("title", "# ")).toBe("# title");
  });

  it("整段已有前缀则去除", () => {
    expect(toggleLinePrefix("- a\n- b", "- ")).toBe("a\nb");
  });

  it("仅部分行有前缀时视为添加(对齐到全部)", () => {
    expect(toggleLinePrefix("> a\nb", "> ")).toBe("> > a\n> b");
  });
});

describe("toggleOrderedList", () => {
  it("逐行编号", () => {
    expect(toggleOrderedList("a\nb\nc")).toBe("1. a\n2. b\n3. c");
  });

  it("整段已编号则去除", () => {
    expect(toggleOrderedList("1. a\n2. b")).toBe("a\nb");
  });
});

describe("toggleTaskList", () => {
  it("逐行加任务项", () => {
    expect(toggleTaskList("a\nb")).toBe("- [ ] a\n- [ ] b");
  });

  it("整段已是任务项则去除(含已勾选)", () => {
    expect(toggleTaskList("- [ ] a\n- [x] b")).toBe("a\nb");
  });
});
