// ACP session/new.mcpServers 的单个 server 配置(转发给 agent,由 agent 连接;见 ADR-0010)。
export interface McpServer {
  name: string;
  command: string;
  args: string[];
  env: { name: string; value: string }[];
}

export interface ParsedMcpServers {
  servers: McpServer[];
  error: string | null;
}

// 解析用户填写的 MCP server 配置(JSON 数组文本)。空文本=无 server;坏 JSON/坏结构=响亮报错
// (不静默兜底,遵循「失败响亮」)。每项规整为 {name,command,args,env},缺省 args/env 归一为空数组。
export function parseMcpServers(text: string): ParsedMcpServers {
  if (text.trim() === "") return { servers: [], error: null };

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    return { servers: [], error: (err as Error).message };
  }
  if (!Array.isArray(raw)) {
    return { servers: [], error: "expected a JSON array of MCP servers" };
  }

  const servers: McpServer[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i] as {
      name?: unknown;
      command?: unknown;
      args?: unknown;
      env?: unknown;
    };
    if (typeof item?.name !== "string" || item.name.trim() === "") {
      return { servers: [], error: `server #${i + 1}: missing "name"` };
    }
    if (typeof item.command !== "string" || item.command.trim() === "") {
      return { servers: [], error: `server #${i + 1}: missing "command"` };
    }
    const args =
      Array.isArray(item.args) && item.args.every((a) => typeof a === "string")
        ? (item.args as string[])
        : [];
    const env =
      Array.isArray(item.env) &&
      item.env.every(
        (e) =>
          typeof (e as { name?: unknown })?.name === "string" &&
          typeof (e as { value?: unknown })?.value === "string",
      )
        ? (item.env as { name: string; value: string }[])
        : [];
    servers.push({ name: item.name, command: item.command, args, env });
  }
  return { servers, error: null };
}
