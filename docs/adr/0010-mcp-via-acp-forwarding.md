# ADR-0010：MCP 集成走 ACP 转发,不引 rmcp——Glyph 不实现 MCP 协议

- 状态：✅ Accepted（2026-06-05）
- 关联：[`0004-ai-agent-host-mcp-acp.md`](0004-ai-agent-host-mcp-acp.md) · [`0008-agent-host-implementation.md`](0008-agent-host-implementation.md)(**部分取代**:MCP 客户端不再用 rmcp)· [`0009-agent-data-security.md`](0009-agent-data-security.md)

## Context（为什么）

ADR-0004 锁定 Glyph 做「ACP 本地宿主 + **MCP 客户端**」。ADR-0008 当时定 MCP 客户端用官方 `rmcp`(tokio 异步)。
但 M4 ACP 落地时,实际实现**刻意偏离**了 0008 的「用官方 crate」——agent.rs 走轻量自研(仅 serde_json,无 tokio),
理由是 footprint 高线(「守轻」)。这就留下一个问题:MCP 客户端到底跟 0008 引 rmcp,还是跟 ACP 的实践自研?

### 联网核实的事实(2026-06)

- **ACP 的 `session/new` 自带 `mcpServers` 字段**:Client 在建会话时把 MCP server 连接信息(`name` / `command` /
  `args` / `env`)交给 **Agent**,由 **Agent** 去连接这些 MCP server——ACP 与 MCP 在一次握手里接好。
- **传输**:所有 Agent **必须**支持 stdio 连 MCP server(默认);HTTP/SSE 为可选能力,init 时协商。
- 即:在 ACP 宿主模型里,**MCP 客户端的角色天然落在 agent 身上,不在编辑器身上**。Glyph 当前在 `session/new`
  已传 `mcpServers: []`(空),把这里填上用户配置的 server 即完成「MCP 集成」。

> 来源:[ACP Session Setup](https://agentclientprotocol.com/protocol/session-setup) ·
> [ACP 介绍(Marc Nuri)](https://blog.marcnuri.com/agent-client-protocol-acp-introduction) ·
> [agent-client-protocol-schema(docs.rs)](https://docs.rs/agent-client-protocol-schema)

## Options（怎么选）

1. **Glyph 自实现 MCP 客户端(引 rmcp)**:0008 原案。Glyph 直接连 MCP server、取 tools/resources。
   代价:rmcp 带 tokio,与「守轻」冲突;且与 ACP 模型重叠——agent 也会连同样的 server,职责重复。
2. **Glyph 自实现轻量 MCP 客户端(手写,仿 agent.rs)**:不引 rmcp,但仍要实现 MCP 协议 + tool 调用 +
   把结果喂回 agent——复杂且与 agent 的 MCP 能力重复。
3. **不实现 MCP 协议,走 ACP 转发**:Glyph 只让用户**配置** MCP server,经 `session/new` 的 `mcpServers`
   **转发给 agent**,由 agent 连接。Glyph 零 MCP 协议代码、零新依赖。

## Decision（定了什么）

采用 **Option 3**,**部分取代 ADR-0008 的「MCP 客户端用 rmcp」**:

- **Glyph 不实现 MCP 协议、不引 rmcp/tokio**。MCP 客户端角色由 ACP agent 承担(spec 本就如此)。
- Glyph 的职责收敛为:① 让用户**配置** MCP server(name/command/args/env);② 把配置经 `session/new`
  的 `mcpServers` 转发给 agent;③ 配置的存取与转发遵循 [ADR-0009](0009-agent-data-security.md) 的数据安全边界
  (配置仅来自用户、不从工作区不可信源加载;env 里的密钥不记录不外泄)。
- 这与 ACP agent 命令自研轻量客户端的既有实践一致:**Glyph 始终是「薄宿主」,重活在 agent**。

### 同行佐证

- **Zed**:正是用 ACP `session/new` 的 `mcpServers` 把用户配置的 MCP server 交给 agent,自身不实现 MCP 协议。
- ACP spec 明确「Agent MUST support stdio MCP」——把 MCP 客户端责任放在 agent 侧是协议设计的本意,不是绕过。

## Consequences（影响与剩余风险）

- ✅ **零新依赖、零 footprint 增量**:守住「轻」高线;无 rmcp/tokio。
- ✅ **职责不重复**:MCP 连接只发生一次(在 agent 侧),不会 Glyph 和 agent 各连一遍。
- ✅ **数据安全可控**:MCP server 配置同样走 ADR-0009 的「仅用户配置 + 不外泄」边界;env 密钥不落日志。
- ⚠️ **能力受限于 agent**:若某 agent 不支持 HTTP/SSE MCP 传输,Glyph 也无能为力(由 agent init 能力决定);
  v1 只保证 stdio(spec 强制)。
- ⚠️ **Glyph 自身拿不到 MCP tools/resources**:编辑器内若想直接用 MCP(不经 agent)需另设计——但当前产品里
  AI 入口就是 agent,无此需求。真出现再开新 ADR。
- 🔜 **落地拆解**:① `McpServer` 配置类型 + 设置面板编辑;② `agent_stream`/`session/new` 接 `mcpServers`
  (替换硬编码 `[]`)+ 序列化单测;③ 配置持久化(走设置存储,不进工作区)。
