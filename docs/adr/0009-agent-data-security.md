# ADR-0009：Agent 数据安全与信任模型——本地转发 + 能力否决 + 知情同意

- 状态：✅ Accepted（2026-06-04）
- 关联：[`0004-ai-agent-host-mcp-acp.md`](0004-ai-agent-host-mcp-acp.md) · [`0008-agent-host-implementation.md`](0008-agent-host-implementation.md) · 安全规则 [`rules/security.md`](../../.claude/rules/security.md)

## Context（为什么）

Glyph 以「Agent 宿主」为护城河:不自建模型、不绑 key,而是 spawn 用户自备的 ACP 适配器
(如 `claude-agent-acp`)做本地子进程,经 stdio 转发提问与回答。这条链路天然涉及**数据外发**——
用户的提问、以及 agent 读取的项目内容,最终会经第三方 agent 抵达其模型提供方。

产品北极星把**数据安全置于功能之上**:绝不能因为接了 agent 就让用户信息在不知情或无边界的情况下泄漏。
因此需要明确回答安全规则的三问:**谁可以做、为什么可以做、做后能追踪到什么**,并把边界固化进代码与测试,
而非停留在口头约定。

### 威胁面盘点(2026-06)

| # | 潜在泄漏向量 | Glyph 现状 |
|---|---|---|
| 1 | Glyph 自身把数据上送到非预期服务 | 无:agent 数据只走**本地 stdio** 管道,Glyph 侧无任何网络发送(唯一出网是 GitHub 更新检查,CSP 白名单仅 `api.github.com`) |
| 2 | 提问/回答被日志或落盘 | 无:仅存于内存 React state;会话持久化(`useSession`)只存路径,不含 agent 内容 |
| 3 | `agent_cmd` 命令注入 | `agent_cmd` 仅来自用户在 AI 面板的输入,**绝不**从工作区文件等不可信来源读取 |
| 4 | agent 借 Glyph 的权限触达 fs/terminal | Glyph 声明 `clientCapabilities.fs/terminal = false`,并对 agent→client 的请求一律回错误 |
| 5 | 用户在无意识下让数据外发 | (改进前)缺口:首次运行无任何告知或确认 |

## Options（怎么选）

1. **完全不接 agent**:最安全但放弃护城河③,违背 ADR-0004。
2. **接 agent,但 Glyph 代理其全部能力(fs/terminal)**:体验顺滑,却把 Glyph 变成 agent 触达用户机器的放大器——一旦 agent 恶意/被诱导,泄漏面急剧扩大。
3. **接 agent,Glyph 仅做受限本地转发 + 否决敏感能力 + 首用知情同意**:守住「本地、最小、可控、知情」。

## Decision（定了什么）

采用 **Option 3**,把信任模型固化为四条不可降的边界:

1. **本地转发,Glyph 不外发**:agent 数据仅经本地 stdio 进出;Glyph 侧不记录、不落盘、不上送。
2. **能力否决是安全边界,不是 v1 缺省**:`client_init_params()` 中 `fs.readTextFile/writeTextFile`、
   `terminal` 恒为 `false`;对 agent→client 的任何请求由 `deny_reply()` 以 JSON-RPC error 回绝。
   → 由 `agent.rs` 的 `client_denies_fs_and_terminal_capabilities` / `denies_agent_requests_with_error`
   两个**回归测试**守卫:任何人把能力翻成 `true` 或改成静默放行,测试立刻失败。
3. **命令仅来自用户输入**:`agent_cmd` 只取自 AI 面板,不从工作区/项目配置等不可信源加载,杜绝注入。
   命令不存在时给可执行指引(`spawn_agent` 的 `ErrorKind::NotFound` 分支),不暴露原始 OS 错误码。
4. **首用知情同意**:首次运行 agent 前弹确认,明确告知「提问及 agent 读取的内容会发给你配置的 agent 及其模型方,
   Glyph 仅本地转发、不存不传」。同意后持久化(localStorage `glyph.agentConsent`),不反复打扰;未同意则不发起。

### 同行佐证

- **Zed / ACP spec**:ACP 把 `fs`、`terminal`、`permission` 设计为 client **显式授予**的能力——client 有权拒绝。
  Glyph 在 v1 选择全部拒绝,是 spec 允许的最保守子集(见 [zed.dev/acp](https://zed.dev/acp)、
  [agentclientprotocol.com](https://agentclientprotocol.com))。
- **VS Code / Zed 的 agent 权限弹窗**:主流编辑器在 agent 写文件/执行命令前都有权限提示;Glyph v1 直接不授予该能力,
  把权限弹窗的复杂度推迟到 v2(届时再按 ADR-0008「安全一等公民」落地细粒度授权)。

## Consequences（影响与剩余风险）

- ✅ Glyph 不构成新的泄漏向量:数据进出可审计、边界有测试守卫、外发有用户知情同意。
- ✅ 失败响亮:命令缺失给指引而非裸 OS 码;能力请求被回绝而非静默吞掉。
- ⚠️ **能力受限**:v1 的 agent 不能经 Glyph 读写文件/开终端,故「agent 直接改代码」类体验要等 v2 的权限框架(ADR-0008)。
- ⚠️ **第三方 agent 自身的行为不受 Glyph 约束**:agent 经自己的 SDK 仍可读盘并发给其模型方——这是用户选择该 agent 的固有授权,
  Glyph 的职责是**透明告知 + 不放大**,不是替第三方 agent 兜底。
- ⚠️ **同意不可在 UI 内撤销(v1)**:清除需手动清 localStorage;v2 在设置面板提供开关 + 工作区级 cwd 边界(把 agent 默认作用域钉到已打开的工程,而非进程启动目录)。
- 🔜 **后续**:agent 命令来源加显式「仅用户配置」校验;cwd 钉到工作区根;细粒度能力授权弹窗;同意状态进设置面板可见可撤销。
