# 任务 0051：Agent 侧栏 transcript 与 Windows 命令解析

- 状态：✅ 完成
- 里程碑：M4 · 关联任务：Agent 宿主真机体验 · 负责人：Codex
- 开工：2026-06-05 · 收工：2026-06-05

> 规范见 [`../../workflow/doc-driven-workflow.md`](../../workflow/doc-driven-workflow.md)。开工前填「Plan」，收工后补「Outcome」。

---

## Plan（开工前）

### 背景 / 目标
重新拉取远端后确认:默认 agent 命令已改为 `claude-code-acp`,但 Windows 下 npm 全局命令仍会落为 `.cmd` shim,`std::process::Command` 不会自动按 PATHEXT 解析;AI 侧栏也仍只保存单个响应字符串,用户发送后看不到自己的提问。目标是修复这两个真机体验缺口。

### 范围 / 非范围
- 范围:Windows `.cmd` agent 命令解析;AI 侧栏 transcript 展示;用户消息立即可见;assistant 消息按 `agent://chunk` 追加;双语文案。
- 非范围:不改变 ACP 协议、MCP 转发、权限模型、diff 审查或多并发会话。

### 方案大纲
Rust `spawn_agent` 保持不经 shell 执行,仅在 Windows 且命令无扩展名时追加 `.cmd` 候选。前端新增 `AgentPanelMessage` 模型,发送时同步追加 user 消息和 streaming assistant 占位,事件监听只更新当前 turn 对应的 assistant 消息。

### 涉及文件
- `src-tauri/src/agent.rs` —— Windows npm `.cmd` shim 候选解析与单测。
- `src/App.tsx` —— agent 消息列表状态与事件增量更新。
- `src/components/command/AgentPanel.tsx` —— transcript 渲染、自动滚动、等待光标。
- `src/i18n/locales/{zh-CN,en}.json` —— 角色、等待、空响应文案。

### 验证计划
- [x] `cargo test --lib`
- [x] `cargo fmt --check`
- [x] `pnpm.cmd typecheck`
- [x] `pnpm.cmd lint`

### 风险与对策
- 命令解析过宽 → 不走 shell、不拼接命令行,只追加 `.cmd` 候选并保持原 args 分离。
- 旧事件串入新会话 → 继续按 `turnId` 过滤,再用当前 assistant message id 精准更新。
- adapter 不真流式 → UI 至少立即显示用户消息和等待态;若 adapter 发分块则实时追加。

---

## Outcome（收工后）

### 实际改动
Windows 下 `claude-code-acp` 会在无扩展命令找不到时继续尝试 `claude-code-acp.cmd`;AI 面板从单个 `result` 改为对话 transcript,发送后立即显示用户提问与 assistant 等待气泡,收到 chunk 时追加文本,完成/错误时更新状态。

### 验证结果
`pnpm.cmd typecheck` 通过;`pnpm.cmd lint` 通过;`cargo test --lib` 通过(22 passed,2 ignored);`cargo fmt --check` 通过。

### 遗留问题
- 真机是否逐字/逐块取决于 `claude-code-acp` 是否实时发送 `agent_message_chunk`;Glyph 侧已按 chunk 即时渲染。

### 下一步
- 本地 GUI 用真实 `claude-code-acp` 验证首块到达时间与实际流式颗粒度。
