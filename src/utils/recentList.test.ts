import { describe, expect, it } from "vitest";

import { pushRecent } from "./recentList";

describe("pushRecent", () => {
  it("新项置顶", () => {
    expect(pushRecent(["a", "b"], "c", 5)).toEqual(["c", "a", "b"]);
  });

  it("重复项去重并提到最前", () => {
    expect(pushRecent(["a", "b", "c"], "c", 5)).toEqual(["c", "a", "b"]);
  });

  it("超过上限则截断尾部", () => {
    expect(pushRecent(["a", "b", "c"], "d", 3)).toEqual(["d", "a", "b"]);
  });

  it("不修改原数组", () => {
    const original = ["a", "b"];
    pushRecent(original, "c", 5);
    expect(original).toEqual(["a", "b"]);
  });
});
