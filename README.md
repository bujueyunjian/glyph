<div align="center">

# Glyph

**The fast, light, beautiful code editor any AI agent can plug into.**

A free, open-source, cross-platform editor for companies that can't ship paid licenses — an order of magnitude lighter than VS Code.

[简体中文](README.zh-CN.md) · [Docs](docs/README.md) · [Vision](docs/product/vision.md) · [Roadmap](docs/roadmap/roadmap.md) · [Releases](https://github.com/bujueyunjian/glyph/releases)

</div>

---

> **Status: active development.** macOS / Linux / Windows builds ship from CI at every milestone — [grab the latest release](https://github.com/bujueyunjian/glyph/releases/latest). The editing core, navigation, LSP, writing-grade Markdown and the AI-agent host are all in. Code signing/notarization and real-machine polish remain. See [`docs/progress/PROGRESS.md`](docs/progress/PROGRESS.md).

## Why Glyph

In 2026, AI coding is the norm and companies care about license compliance. Yet no editor is *all of*: permissively-licensed OSS · free for companies · natively lightweight · beautiful out of the box · approachable (non-modal) · turnkey LSP/Git · cross-platform.

- **Sublime** costs money for business use; **Notepad++** is free but Windows-only; **VS Code**'s official binary is a proprietary EULA with marketplace lock-in.
- **Zed** is closest but GPL/AGPL, Rust-heavy and AI/cloud-oriented; **Lapce** is the right idea but immature.

Glyph aims for the empty center.

## The differentiation triangle

- ⚡ **Light · Fast · Beautiful** — target <15 MB install / <40 MB RAM / <500 ms cold start; instant-feeling input; gorgeous defaults. First-paint JS is held under a CI budget; the editor core and language packs are lazy-loaded so they never touch first paint.
- 🤖 **Agent host** — no bundled models, no key lock-in. Bet on **MCP** (client) + **ACP** (host) so Claude Code / Codex / Copilot CLI run *inside* the editor.
- ✍️ **Writing-grade Markdown + plugin ecosystem** — Obsidian-style Live Preview; plugin-first, with core features dogfooding the same API.

## What's inside today

- **Editor core** — CodeMirror 6 with 50+ language highlights (lazy-loaded), multi-tab with independent undo/cursor, split view, multiple themes (dark / light / pure black), persistent settings, session restore.
- **Navigation** — command palette (`Ctrl/⌘+Shift+P`), Goto Anything (`Ctrl/⌘+P`; `:` line, `@` symbol), find/replace, cross-file search, **document outline** (LSP symbols + Markdown headings), file tree with create/rename/delete + live file watching.
- **Right-click context menu** — cut/copy/paste, find/replace, and — when a language server is connected — go to definition, find references, rename, format.
- **LSP** — completion · diagnostics · hover · go to definition · find references · format · rename · document symbols. The protocol lives in Rust and is verified end-to-end against a real `rust-analyzer`. Language servers are **not** bundled (staying light) — point Glyph at your own.
- **Writing-grade Markdown** — render + split preview, Obsidian-style inline Live Preview, format commands (bold/italic/headings/quote/lists), task lists.
- **Agent host** — connect any ACP adapter (e.g. `claude-agent-acp`), stream a conversation in a side panel, and configure **MCP servers** that are forwarded to the agent. **No bundled model, no key lock-in.** Your prompts are forwarded to *your* chosen agent only — with first-run informed consent, a strict no-fs/no-terminal capability boundary, and workspace-scoped working directory. Glyph stores and uploads nothing itself ([ADR-0009](docs/adr/0009-agent-data-security.md) · [ADR-0010](docs/adr/0010-mcp-via-acp-forwarding.md)).

## Install

Download the build for your OS from [the latest release](https://github.com/bujueyunjian/glyph/releases/latest):

| OS | File |
|---|---|
| macOS | `Glyph-*-macOS-universal.dmg` |
| Windows | `Glyph-*-Windows-x86_64-setup.exe` |
| Linux | `*.AppImage` or `*.deb` (x86_64 / aarch64) |

> Builds aren't code-signed/notarized yet, so your OS may warn on first launch (Gatekeeper / SmartScreen). Signing is on the roadmap.

To use AI features, install an ACP adapter, e.g. `npm i -g @zed-industries/claude-code-acp` (provides the `claude-agent-acp` command). Glyph bundles no model or key.

## Tech stack

Tauri 2 (Rust core + system WebView) · React 19 + TypeScript + Vite · CodeMirror 6 · tree-sitter · LSP · Tailwind v4 + Radix. Every layer is mainstream and production-proven. The iron law: **heavy work in Rust, the WebView only renders** — that's how the footprint and latency targets hold. See [ADR-0001](docs/adr/0001-tauri-codemirror-stack.md).

## Develop

```bash
pnpm install
pnpm tauri:dev     # full app (Rust + webview)
pnpm dev           # frontend only (Vite)
pnpm check         # typecheck + lint + format + rs:fmt + rs:clippy + tests (the CI gate)
```

## Contributing

This project is **documentation-driven**: every task gets a *Plan* doc before and an *Outcome* doc after, so humans and AI agents can hand off seamlessly. Read [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`docs/workflow/doc-driven-workflow.md`](docs/workflow/doc-driven-workflow.md).

## License

Open source; final license (MIT / Apache-2.0) to be fixed before GA. See [`docs/product/vision.md`](docs/product/vision.md).
