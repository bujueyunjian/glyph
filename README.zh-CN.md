<div align="center">

# Glyph

**又快、又轻、又美，任何 AI agent 都能插进来的代码编辑器。**

一个面向"无法采用付费授权"的公司的免费开源跨平台编辑器——比 VS Code 轻一个数量级。

[English](README.md) · [文档](docs/README.md) · [愿景](docs/product/vision.md) · [路线图](docs/roadmap/roadmap.md)

</div>

---

> ⚠️ **状态：早期地基（M0）。** 愿景、调研、架构已锁定；可运行骨架与第一个功能进行中。见 [`docs/progress/PROGRESS.md`](docs/progress/PROGRESS.md)。

## 为什么是 Glyph

2026 年，AI 编码已成常态，企业愈发在意版权合规。但没有一个编辑器**同时**满足：宽松许可证 OSS · 公司零成本 · 原生轻量 · 开箱即美 · 非模态友好 · 开箱即用 LSP/Git · 跨平台。

- **Sublime** 企业要付费；**Notepad++** 免费但只有 Windows；**VS Code** 官方包是专有 EULA + 市场锁定。
- **Zed** 最接近但 GPL/AGPL、Rust 重、偏 AI 云；**Lapce** 方向对但不成熟。

Glyph 瞄准这块正中间的空白。

## 差异化三角

- ⚡ **轻 · 快 · 美** —— 目标 <15MB 安装 / <40MB 内存 / <500ms 冷启动；键入感觉即时；开箱即美。
- 🤖 **Agent 宿主** —— 不自建模型、不绑 key。押 **MCP**（客户端）+ **ACP**（宿主），让 Claude Code / Codex / Copilot CLI 在编辑器内运行。
- ✍️ **写作级 Markdown + 插件生态** —— Obsidian 式 Live Preview；插件优先，核心功能 dogfood 同一套 API。

## 技术栈

Tauri 2（Rust 核心 + 系统 WebView）· React 19 + TypeScript + Vite · CodeMirror 6 · tree-sitter · LSP · Tailwind v4 + shadcn/Radix。每一层都主流且经生产验证。见 [ADR-0001](docs/adr/0001-tauri-codemirror-stack.md)。

## 开发

> 骨架落地后（任务 #3）可用。

```bash
pnpm install
pnpm tauri:dev     # 完整应用（Rust + webview）
pnpm check         # typecheck + lint + format + rs:fmt + rs:clippy
```

## 贡献

本项目**文档驱动**：每个任务开工前写「计划」、收工后写「变更」文档，方便人与 AI agent 无缝接力。请读 [`CONTRIBUTING.md`](CONTRIBUTING.md) 与 [`docs/workflow/doc-driven-workflow.md`](docs/workflow/doc-driven-workflow.md)。

## 许可证

开源；最终许可证（MIT / Apache-2.0）GA 前确定。见 [`docs/product/vision.md`](docs/product/vision.md)。
