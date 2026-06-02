# 任务 0001：立项地基文档

- 状态：✅ 完成
- 里程碑：M0 · 关联任务：#1（TaskList）· 负责人：Claude
- 开工：2026-06-02 · 收工：2026-06-02

---

## Plan（开工前）

### 背景 / 目标
立项 Glyph（开源跨平台轻量代码编辑器）。本任务把多智能体调研结论沉淀为分层文档，确立方向，作为后续所有开发任务的"before 文档"。

### 范围 / 非范围
- 范围：docs 分层结构；调研综述 + 5 份分领域；愿景；设计体系；架构（总览+插件+AI）；4 份 ADR；路线图；进度追踪体系；文档驱动工作流。
- 非范围：代码、脚手架、元文件（CLAUDE.md/README/CONTRIBUTING，归任务 #2）。

### 验证计划
- [x] 文档结构齐备、互链正确
- [x] 调研事实采用核查修正后的版本

---

## Outcome（收工后）

### 实际改动（新增文件）
- `docs/README.md` —— 文档导航
- `docs/product/vision.md` —— 愿景 / 定位 / 差异化三角 / 非目标 / 商业模式
- `docs/research/00-summary.md` —— 调研综述 + **7 处核查修正清单**
- `docs/research/01-landscape.md` ~ `05-design-ux.md` —— 5 份分领域调研
- `docs/research/sources.md` —— 全部一手来源
- `docs/design/design-system.md` —— 10 准则 + 性能 SLO + 视觉方向
- `docs/architecture/overview.md`、`plugin-architecture.md`、`ai-agent-architecture.md`
- `docs/adr/0001`~`0004` —— Tauri+CM6 / MD Live Preview / 插件优先 / Agent 宿主
- `docs/roadmap/roadmap.md` —— M0–M6 里程碑
- `docs/progress/PROGRESS.md`、`tasks/TEMPLATE.md`、`tasks/0001-foundation-docs.md`（本文件）
- `docs/workflow/doc-driven-workflow.md`

### 关键决策（已固化为 ADR）
1. 技术栈 = Tauri 2 + CodeMirror 6 + tree-sitter + LSP（[ADR-0001](../../adr/0001-tauri-codemirror-stack.md)）
2. Markdown = Obsidian 式 Live Preview（[ADR-0002](../../adr/0002-markdown-live-preview.md)）
3. 插件优先 + dogfooding（[ADR-0003](../../adr/0003-plugin-first-architecture.md)）
4. AI = agent 宿主，押 MCP + ACP（[ADR-0004](../../adr/0004-ai-agent-host-mcp-acp.md)）

### 验证结果
- 文档体系完整、状态行与互链一致。✅
- 调研采用对抗式核查后的修正值（lsp-client v6.2.2、floem 在维护、VS Code RAM 为最坏情况、Codex 4M+ WAU 等）。✅

### 遗留问题
- 插件沙箱选型（WASI vs JS worker）、capability 清单、插件 manifest 格式待 ADR 细化。
- UI 字体最终取舍（Geist vs Inter）待定。
- 许可证（MIT vs Apache-2.0）M6 前终定。

### 下一步
- 任务 #2：项目元文件（CLAUDE.md / README / CONTRIBUTING）。
- 任务 #3：Tauri 2 + React 19 + Vite 可运行骨架。
