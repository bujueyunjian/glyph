import { describe, expect, it } from "vitest";

import { serverForExtension } from "./servers";

describe("serverForExtension", () => {
  it("已知语言返回服务器", () => {
    expect(serverForExtension("rs")?.command).toBe("rust-analyzer");
    expect(serverForExtension("py")?.command).toBe("pyright-langserver");
  });

  it("ts/tsx/js 共用 typescript-language-server", () => {
    const names = ["ts", "tsx", "js", "jsx"].map(
      (e) => serverForExtension(e)?.name,
    );
    expect(new Set(names)).toEqual(new Set(["typescript-language-server"]));
  });

  it("未知扩展名返回 null(不报错,状态栏显空)", () => {
    expect(serverForExtension("xyz")).toBeNull();
    expect(serverForExtension("")).toBeNull();
  });
});
