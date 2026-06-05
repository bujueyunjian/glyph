<div align="center">

# Glyph

**又快、又轻、又美，任何 AI agent 都能插进来的代码编辑器。**

一个面向"无法采用付费授权"的公司的免费开源跨平台编辑器——比 VS Code 轻一个数量级。

[English](README.md) · [文档](docs/README.md) · [愿景](docs/product/vision.md) · [路线图](docs/roadmap/roadmap.md) · [下载](https://github.com/bujueyunjian/glyph/releases)

</div>

---

> **状态：积极开发中。** macOS / Linux / Windows 安装包随 CI 在每个里程碑发布——[下载最新版](https://github.com/bujueyunjian/glyph/releases/latest)。编辑核心、导航、LSP、写作级 Markdown、AI Agent 宿主均已具备；代码签名/公证与真机打磨待办。见 [`docs/progress/PROGRESS.md`](docs/progress/PROGRESS.md)。

## 为什么是 Glyph

2026 年，AI 编码已成常态，企业愈发在意版权合规。但没有一个编辑器**同时**满足：宽松许可证 OSS · 公司零成本 · 原生轻量 · 开箱即美 · 非模态友好 · 开箱即用 LSP/Git · 跨平台。

- **Sublime** 企业要付费；**Notepad++** 免费但只有 Windows；**VS Code** 官方包是专有 EULA + 市场锁定。
- **Zed** 最接近但 GPL/AGPL、Rust 重、偏 AI 云；**Lapce** 方向对但不成熟。

Glyph 瞄准这块正中间的空白。

## 差异化三角

- ⚡ **轻 · 快 · 美** —— 目标 <15MB 安装 / <40MB 内存 / <500ms 冷启动；键入感觉即时；开箱即美。首屏 JS 体积有 CI 门禁守住；编辑器内核与语言包懒加载，绝不进首屏。
- 🤖 **Agent 宿主** —— 不自建模型、不绑 key。押 **MCP**（客户端）+ **ACP**（宿主），让 Claude Code / Codex / Copilot CLI 在编辑器内运行。
- ✍️ **写作级 Markdown + 插件生态** —— Obsidian 式 Live Preview；插件优先，核心功能 dogfood 同一套 API。

## 现已具备

- **编辑核心** —— CodeMirror 6，50+ 语言高亮（懒加载）；多标签（独立撤销/光标）；分屏；多主题（深/浅/纯黑）；设置持久化；会话恢复。
- **导航** —— 命令面板（`Ctrl/⌘+Shift+P`）、Goto Anything（`Ctrl/⌘+P`；`:` 跳行、`@` 跳符号）、查找/替换、跨文件搜索、**文档大纲**（LSP 符号 + Markdown 标题）、文件树（增删改 + 实时监听）。
- **右键上下文菜单** —— 剪切/复制/粘贴、查找/替换，以及（连上语言服务器时）转到定义、查找引用、重命名、格式化。
- **LSP** —— 补全 · 诊断 · 悬停 · 转到定义 · 查找引用 · 格式化 · 重命名 · 文档符号。协议实现在 Rust，对真实 `rust-analyzer` 端到端验证。**不打包**语言服务器（守轻）——接你自己的。
- **写作级 Markdown** —— 渲染 + 分屏预览、Obsidian 式行内 Live Preview、格式化命令（粗/斜/标题/引用/列表）、任务列表。
- **Agent 宿主** —— 接任意 ACP 适配器（如 `claude-code-acp`），侧栏流式对话，并可配置 **MCP server**（转发给 agent）。**不绑模型、不绑 key。** 你的提问只转发给你选的 agent——首次运行知情同意、严格的「不碰文件系统/终端」能力边界、工作区级作用域。Glyph 自身不存储不上传（[ADR-0009](docs/adr/0009-agent-data-security.md) · [ADR-0010](docs/adr/0010-mcp-via-acp-forwarding.md)）。

## 安装

从[最新发布](https://github.com/bujueyunjian/glyph/releases/latest)下载对应系统的包：

| 系统 | 文件 |
|---|---|
| macOS | `Glyph-*-macOS-universal.dmg` |
| Windows | `Glyph-*-Windows-x86_64-setup.exe` |
| Linux | `*.AppImage` 或 `*.deb`（x86_64 / aarch64） |

> 安装包尚未签名/公证，首次启动系统可能告警（Gatekeeper / SmartScreen）。签名在路线图上。

要用 AI 功能，先装一个 ACP 适配器，如 `npm i -g @zed-industries/claude-code-acp`（它提供 `claude-code-acp` 命令）。Glyph 不内置模型/密钥。

## 技术栈

Tauri 2（Rust 核心 + 系统 WebView）· React 19 + TypeScript + Vite · CodeMirror 6 · tree-sitter · LSP · Tailwind v4 + Radix。每一层都主流且经生产验证。铁律：**重活在 Rust、WebView 只渲染**——这是 footprint 与延迟达标的前提。见 [ADR-0001](docs/adr/0001-tauri-codemirror-stack.md)。

## 开发

```bash
pnpm install
pnpm tauri:dev     # 完整应用（Rust + webview）
pnpm dev           # 仅前端（Vite）
pnpm check         # typecheck + lint + format + rs:fmt + rs:clippy + 测试（CI 门禁）
```

## 贡献

本项目**文档驱动**：每个任务开工前写「计划」、收工后写「变更」文档，方便人与 AI agent 无缝接力。请读 [`CONTRIBUTING.md`](CONTRIBUTING.md) 与 [`docs/workflow/doc-driven-workflow.md`](docs/workflow/doc-driven-workflow.md)。

## 许可证

开源；最终许可证（MIT / Apache-2.0）GA 前确定。见 [`docs/product/vision.md`](docs/product/vision.md)。
