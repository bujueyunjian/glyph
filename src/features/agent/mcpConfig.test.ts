import { describe, expect, it } from "vitest";

import { parseMcpServers } from "./mcpConfig";

describe("parseMcpServers", () => {
  it("解析合法数组,补齐 args/env 缺省", () => {
    const text = JSON.stringify([
      { name: "fs", command: "mcp-fs", args: ["--stdio"] },
      {
        name: "gh",
        command: "mcp-gh",
        env: [{ name: "TOKEN", value: "x" }],
      },
    ]);
    expect(parseMcpServers(text)).toEqual({
      servers: [
        { name: "fs", command: "mcp-fs", args: ["--stdio"], env: [] },
        {
          name: "gh",
          command: "mcp-gh",
          args: [],
          env: [{ name: "TOKEN", value: "x" }],
        },
      ],
      error: null,
    });
  });

  it("空文本=无 server 无错", () => {
    expect(parseMcpServers("   ")).toEqual({ servers: [], error: null });
  });

  it("坏 JSON / 非数组 / 缺字段都响亮报错(不静默兜底)", () => {
    expect(parseMcpServers("{not json").error).toBeTruthy();
    expect(parseMcpServers('{"a":1}').error).toMatch(/array/);
    expect(parseMcpServers('[{"command":"x"}]').error).toMatch(/name/);
    expect(parseMcpServers('[{"name":"x"}]').error).toMatch(/command/);
    // 报错时不返回半成品 server
    expect(parseMcpServers('[{"command":"x"}]').servers).toEqual([]);
  });
});
