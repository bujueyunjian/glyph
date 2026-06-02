# Glyph 进度与方向

> **每次开工先读这里。** 这是项目的当前状态与方向的权威快照。
> 方向细节见 [`../roadmap/roadmap.md`](../roadmap/roadmap.md)；每个任务的前/后文档见 [`tasks/`](tasks/)。

- 最后更新：2026-06-02（M0 全部任务编译/门禁层完成；第一个功能 GUI 待用户自验）
- 当前里程碑：**M0 立项地基**（收官中）
- 一句话定位：公司能免费铺给 500 名开发者、无需授权、无需法务审查的跨平台代码编辑器——又快、又轻、又美，任何 AI agent 都能插进来。

---

## 已锁定的方向（改动需走 ADR）

| 维度 | 决定 | ADR |
|---|---|---|
| 技术栈 | Tauri 2 + CodeMirror 6 + tree-sitter + LSP；前端 React 19+TS+Vite（对齐 git-ai-studio） | [0001](../adr/0001-tauri-codemirror-stack.md) |
| Markdown | Obsidian 式 Live Preview（非 Typora 全 WYSIWYG），做成第一方插件 | [0002](../adr/0002-markdown-live-preview.md) |
| 扩展性 | 插件优先 + dogfooding；公共 API/市场留 v2+ | [0003](../adr/0003-plugin-first-architecture.md) |
| AI | agent 宿主：MCP 客户端 + ACP 本地宿主；不自建模型/不绑 key | [0004](../adr/0004-ai-agent-host-mcp-acp.md) |
| 许可证 | 倾向 MIT/Apache-2.0（M6 前终定） | —— |
| 名称 | `Glyph`（工作名，待商标/域名核查） | —— |

## 任务看板（M0）

| # | 任务 | 状态 | 文档 |
|---|---|---|---|
| 0 | 多智能体调研 + 对抗式核查 | ✅ | [research/](../research/) |
| 1 | 立项地基文档 | ✅ | [0001](tasks/0001-foundation-docs.md) |
| 2 | 项目元文件（CLAUDE.md/README/CONTRIBUTING） | ✅ | [0002](tasks/0002-project-meta.md) |
| 3 | Tauri 2 + React 19 + Vite 可运行骨架 | ✅ | [0003](tasks/0003-scaffold.md) |
| 4 | 第一个功能：文件读写 + 语法高亮 | ✅ 编译层（GUI 待自验） | [0004](tasks/0004-file-edit-highlight.md) |
| 5 | 验证：骨架全门禁通过（install/build/lint/clippy/fmt） | ✅ | [0003](tasks/0003-scaffold.md) |

> 骨架验证结论（2026-06-02）：前端构建 JS 280.95 kB / gzip 88 kB；cargo check/clippy 无警告（Tauri 2.11.2）。GUI 自检需本地 `pnpm tauri:dev`。命名已按 specflow 规范（见 [standards/naming.md](../standards/naming.md)）。

## 环境与工具链（本机已确认 2026-06-02）
- Node v24.12.0 / pnpm 10.33.0 / Rust 1.95.0 / cargo 1.95.0 / git 2.54
- Tauri CLI 走项目 devDependency（`@tauri-apps/cli`），用 pnpm 调用
- 参照项目：`../../../git-ai-studio`（同款 Tauri 2 + React 19 + CM6 栈与约定）

## 已完成（M0→M1，截至 2026-06-02）
调研 → … → 文件树 → 多标签 → Goto Anything → 查找/替换 → 工作区 UX(侧栏/最近/菜单) → **设置面板(Ctrl/Cmd+, · 字号/Tab/缩进/换行/行号/连字/主题,持久化)**。release 二进制 6.3MB。

## 下一步（立即，建议顺序）
1. 文件树右键增删改（新建/重命名/删除）、文件监听自动刷新、`.gitignore` 过滤。
2. 标签拖拽排序、未保存关闭确认、分屏。
3. 跨文件全局查找替换（ripgrep 后端）；符号查找（`@`，需 LSP/tree-sitter）。
4. 设置增强：字体族选择、键位自定义、Rust 配置持久化（跨设备）。
5. 键入延迟 CI 门禁原型（设计体系 B 节）；本地 `pnpm tauri build` GUI/性能自检。

## 性能/"轻"感知（用户反馈：感觉比 Notepad++/Typora 重）—— 任务 #7 已修
> 结论：部分是 dev 调试构建的错觉，部分是真实问题。判断"轻不轻"要看 `pnpm tauri build` 的 release 包，不是 `tauri:dev`。
> **修复结果（2026-06-02，任务 [0006](tasks/0006-perf-lazy-fonts-keystroke.md)）：首屏 JS 1,104KB/gzip 377KB → 366KB/gzip 117KB（−69% gzip），>500KB 警告消除。**
1. ✅ **语言包懒加载**：改 `import()` 动态加载 → 7 个语言包成按需 chunk。
2. ✅ **字体**：改 `wght.css`。修正认知：fontsource 用 unicode-range 分面，运行时本就只下载 latin，"全字集拖累运行时"是误判，大头是语言包。
3. ✅ **按键架构**：CodeMirror 自己持有文档 + 仅标脏 + 保存时经 ref 取内容，去掉"每键整篇过 React state"。
4. ✅ **额外**：整个编辑器 React.lazy 懒加载——空态启动不加载 CodeMirror。
5. ✅ **release 二进制体积 = 6.3MB**（`cargo build --release` 重试成功，确认首次是 rustc 编 serde_derive 的偶发栈溢出崩溃；系统 WebView 不计入，对比 VS Code 300MB+ —— "轻"已坐实）。
6. ⏳ 键入延迟原型 + CI 帧时/延迟门禁（设计体系 B 节）；冷启动/键入延迟需本地 release 包实测。

> 语言覆盖（任务 [0007](tasks/0007-language-coverage.md)）：从 8 类扩到 ~50 个扩展名（官方 Lezer + legacy-modes），全部懒加载，初始体积不变。

## 待决问题（open questions）
- 🔴 **语言包懒加载**（见上性能清单 #1）。
- 黑屏根因：已提升对比度 + 加入编辑器内容；GUI 是否真渲染待用户确认（仍全黑则需 Console 报错）。
- 插件沙箱选型（WASI vs JS worker/QuickJS）。
- UI 字体（Geist vs Inter）。
- 许可证最终（MIT vs Apache-2.0）。
- 键入延迟原型何时插入（建议 M1 第一件事，但骨架期就预埋测量）。

## 重要提醒
- **性能 SLO（延迟/footprint）是承诺，需尽早进 CI 门禁。**
- **失败响亮**：不写降级/兼容兜底；验证失败如实记录。
- 每个任务**前写 Plan、后写 Outcome**（[工作流](../workflow/doc-driven-workflow.md)）。
