<div align="center">

# Glyph

**The fast, light, beautiful code editor any AI agent can plug into.**

A free, open-source, cross-platform editor for companies that can't ship paid licenses — an order of magnitude lighter than VS Code.

[简体中文](README.zh-CN.md) · [Docs](docs/README.md) · [Vision](docs/product/vision.md) · [Roadmap](docs/roadmap/roadmap.md)

</div>

---

> ⚠️ **Status: early foundation (M0).** Vision, research and architecture are locked; the runnable skeleton and first feature are in progress. See [`docs/progress/PROGRESS.md`](docs/progress/PROGRESS.md).

## Why Glyph

In 2026, AI coding is the norm and companies care about license compliance. Yet no editor is *all of*: permissively-licensed OSS · free for companies · natively lightweight · beautiful out of the box · approachable (non-modal) · turnkey LSP/Git · cross-platform.

- **Sublime** costs money for business use; **Notepad++** is free but Windows-only; **VS Code**'s official binary is a proprietary EULA with marketplace lock-in.
- **Zed** is closest but GPL/AGPL, Rust-heavy and AI/cloud-oriented; **Lapce** is the right idea but immature.

Glyph aims for the empty center.

## The differentiation triangle

- ⚡ **Light · Fast · Beautiful** — target <15 MB install / <40 MB RAM / <500 ms cold start; instant-feeling input; gorgeous defaults.
- 🤖 **Agent host** — no bundled models, no key lock-in. Bet on **MCP** (client) + **ACP** (host) so Claude Code / Codex / Copilot CLI run *inside* the editor.
- ✍️ **Writing-grade Markdown + plugin ecosystem** — Obsidian-style Live Preview; plugin-first, with core features dogfooding the same API.

## Tech stack

Tauri 2 (Rust core + system WebView) · React 19 + TypeScript + Vite · CodeMirror 6 · tree-sitter · LSP · Tailwind v4 + shadcn/Radix. Every layer is mainstream and production-proven. See [ADR-0001](docs/adr/0001-tauri-codemirror-stack.md).

## Development

> Available once the skeleton lands (task #3).

```bash
pnpm install
pnpm tauri:dev     # full app (Rust + webview)
pnpm check         # typecheck + lint + format + rs:fmt + rs:clippy
```

## Contributing

This project is **documentation-driven**: every task gets a *Plan* doc before and an *Outcome* doc after, so humans and AI agents can hand off seamlessly. Read [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`docs/workflow/doc-driven-workflow.md`](docs/workflow/doc-driven-workflow.md).

## License

Open source; final license (MIT / Apache-2.0) to be fixed before GA. See [`docs/product/vision.md`](docs/product/vision.md).
