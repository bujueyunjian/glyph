import { describe, expect, it } from "vitest";

import { isNewerVersion, parseVersion } from "./version";

describe("parseVersion", () => {
  it("解析 x.y.z 并去 v 前缀", () => {
    expect(parseVersion("v1.2.3")).toEqual([1, 2, 3]);
    expect(parseVersion("0.0.8")).toEqual([0, 0, 8]);
  });
  it("缺段补 0", () => {
    expect(parseVersion("1")).toEqual([1, 0, 0]);
  });
});

describe("isNewerVersion", () => {
  it("各段递增判定", () => {
    expect(isNewerVersion("0.0.9", "0.0.8")).toBe(true);
    expect(isNewerVersion("0.1.0", "0.0.9")).toBe(true);
    expect(isNewerVersion("1.0.0", "0.9.9")).toBe(true);
  });
  it("相等或更旧返回 false", () => {
    expect(isNewerVersion("0.0.8", "0.0.8")).toBe(false);
    expect(isNewerVersion("0.0.7", "0.0.8")).toBe(false);
    expect(isNewerVersion("v0.0.8", "0.0.8")).toBe(false);
  });
});
