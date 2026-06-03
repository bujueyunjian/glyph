# ADR-0007：in-editor AI 形态——「AI = 返回编辑/产物的命令」，host-first

- 状态：⏳ Proposed（2026-06-03）
- 关联：[`0004-ai-agent-host-mcp-acp.md`](0004-ai-agent-host-mcp-acp.md) · [`0006-internal-extension-points.md`](0006-internal-extension-points.md)

## Context

用户希望 Glyph 有 in-editor AI：润色/改写、自然语言交互、文本→图表、排版等。这些很多正是 Cursor/Windsurf 那一套。但 ADR-0004 已锁定定位：**做 agent 宿主、BYO-key、零模型开销，明确不自建模型、不硬刚 Cursor**。需要一条原则界定：哪些 AI 功能 Glyph 自建、以什么形态建、哪些交给外部 agent，才能既给用户 AI 价值、又不偏离"中立宿主"的护城河、且不违背"延迟即产品"。

## Options

1. **自建丰富 in-editor AI**（自有补全/agent，对标 Cursor）：体验最"全"，但烧钱、永远追前沿、攻击面大，**直接违背 ADR-0004**。
2. **完全不自建任何 AI**：纯靠用户配置外部 agent。最省，但用户得不到开箱即用的即时 AI 价值。
3. **AI = 返回「编辑/产物」的命令，host-first + 薄 BYO-key**：自建仅最薄动作层，重活交给宿主 agent（ACP）/ MCP 工具。

## Decision

采用 **Option 3**，并定为所有 in-editor AI 的统一形态原则：

- **统一抽象**：每个 AI 功能都是一个**命令**——输入（选区 / 上下文）→ 产出（一个**文本编辑** 或 一个**渲染产物**如 mermaid）。走与普通命令**同一条**管线（命令面板 + [ADR-0006](0006-internal-extension-points.md) 扩展缝）。AI 不是特殊子系统，是"编辑/产物的提供者"。
- **host-first**：能交给宿主 agent（ACP：Claude Code/Codex）或 MCP 工具的（自然语言交互、agentic 多文件、复杂任务），就**交出去**，Glyph 不自建大脑。
- **薄 BYO-key 动作层**：仅保留最薄的"选区 → 模型 → 返回编辑 → diff 审查"动作（润色/改写）；多 provider（OpenAI 兼容端点 / 本地模型；DeepSeek 等经此接入）；**用户自带 key，零模型开销**。
- **text→图表**：NL → mermaid 一次性生成，渲染进 ②（Markdown 画布）；属薄 BYO-key 命令，依赖 M3 mermaid 先成。
- **红线**：AI 命令**绝不阻塞打字热路径**（全异步）；AI 产出的编辑一律经 **diff 审查 / 可撤销**；raw 输出经 ② 的消毒（DOMPurify）。
- **不做**：自建模型 / 自有 AI 大脑 / 自主多文件 agent；AI 排版/格式化（用确定性 formatter，经 LSP/工具）；重度自建润色/NL 引擎。

### 同行佐证
- **Zed**：原生薄 in-editor AI + ACP 外部 agent 宿主并存的成功范例。
- **Continue.dev**：BYO-key + 多 provider 路由的开源范式。

## Consequences

- ✅ AI 价值落地且**资本极轻**；AI 作为"命令提供者"天然可组合、可测、不阻塞热路径。
- ✅ 与 ADR-0004 的"中立宿主、零模型开销"护城河一致；与 ADR-0006 扩展缝复用同一接入路径。
- ⚠️ 薄层体验要靠**速度 + UX（diff/上下文/延迟）** 才能与 Cursor 拉开，而非模型质量——必须做精。
- ⚠️ BYO-key 的存储/安全需谨慎（密钥不落明文、不外泄；后续可单独 ADR）。
- 📝 具体 provider 路由、补全形态（ghost-text 等）随 M4 落地细化；本 ADR 只定"AI = 命令、host-first、薄、不阻塞"的总原则。
