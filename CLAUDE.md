# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 与人类贡献者在本仓库工作时提供指引。

## 项目定位

`Glyph` 是一个**开源、跨平台、极致轻量的现代代码编辑器**（Tauri v2 桌面应用：前端 React 19 + TypeScript，后端 Rust）。目标是填补市场空白——**宽松许可证 OSS + 公司零成本 + 原生轻量 + 开箱即美 + 非模态友好 + 任何 AI agent 都能插进来**。对标 Sublime / VS Code 的体验，但明确**比 VS Code 轻一个数量级**。

差异化三角（缺一不可，详见 [`docs/product/vision.md`](docs/product/vision.md)）：
- **⚡ 轻 · 快 · 美**：目标 <15MB 安装 / <40MB 内存 / <500ms 冷启动；键入"感觉即时"；开箱即美。
- **🤖 Agent 宿主**：不自建模型、不绑 key；押 MCP（客户端）+ ACP（本地宿主），让 Claude Code/Codex/Copilot CLI 在编辑器内运行。
- **✍️ 写作级 Markdown + 插件生态**：Obsidian 式 Live Preview；插件优先 + dogfooding。

- **三平台齐发**：macOS + Linux + Windows
- **双语 UI**：中文 + 英文（i18next）
- **开源**，许可证倾向 MIT/Apache-2.0（M6 前终定）

> ⭐ **北极星 · 用户体验高于一切，且由我们引领（We lead, not serve）**：我们以强烈的产品主张**替用户定义什么是好体验、引领用户**，而非无条件服从用户的要求/反馈（Jobs：*"People don't know what they want until you show it to them"*）。用户反馈是信号、不是命令——取舍由我们的品味和判断拍板。但我们对**体验本身的标准绝不妥协**：延迟、流畅、即时、克制、开箱即美是不可降的高线，凌驾于功能数量与工程偏好之上。当功能 / 工期 / 技术优雅 与 体验标准冲突时——**砍功能、压范围、弃优雅，守住体验高线**（呼应 Jobs「从客户体验倒推技术」、设计准则 #1「延迟即产品」）。

## 当前进度（下次从这里继续 · 截至 2026-06-02）

**入口**：先读 [`docs/progress/PROGRESS.md`](docs/progress/PROGRESS.md)（权威进度）+ [`docs/roadmap/roadmap.md`](docs/roadmap/roadmap.md)（里程碑）+ 最近的 [`docs/progress/tasks/*.md`](docs/progress/tasks/)。

**已交付（M0 ✅ + M1 主体 ✅，任务 0001–0014）**：可运行 Tauri 骨架；文件读写 + 50+ 语言高亮；多主题（深/浅/纯黑）；命令面板（`Ctrl/⌘+Shift+P`）；项目文件树（打开文件夹/拖宽/`Ctrl/⌘+B` 开关）；多标签（独立撤销/光标）；Goto Anything（`Ctrl/⌘+P` 文件查找 + `:` 跳行）；查找/替换（`Ctrl/⌘+F`）；最近文件；完整菜单栏（文件/编辑/视图/帮助）；设置面板（`Ctrl/⌘+,`，字号/Tab/缩进/换行/行号/连字/主题，持久化）。release 二进制 6.3MB、首屏 gzip ~128KB。

**性能红线（守住别回退）**：首屏只含 React+外壳，**CodeMirror 与语言包必须保持懒加载**；编辑相关 CM 函数用动态 `import()`，**严禁静态导入把 CM 拉回首屏**（构建出现 >500KB 警告即是信号）；每键不得让整篇文档过 React state。

**下一步（详见 PROGRESS「下一步」）**：① 文件树右键增删改 + 文件监听刷新；② 分屏 / 标签拖拽 / 未保存关闭确认；③ 差异化支柱②：**Markdown Live Preview（M3）**；④ 差异化支柱③：**Agent 宿主 MCP+ACP（M4）**；⑤ LSP（M2）；⑥ 键入延迟 CI 门禁。「轻·快·美」地基已成，支柱② ③ 未动。

**本地运行**：`pnpm install` → `pnpm tauri:dev`（GUI）。新增依赖后 dev 需重启。本环境（headless）不跑 GUI。

## 重要文档（动手前先扫一眼）

- [`docs/progress/PROGRESS.md`](docs/progress/PROGRESS.md) —— **当前进度与方向，每次开工先读这里**
- [`docs/product/vision.md`](docs/product/vision.md) —— 愿景/定位/差异化三角/非目标。任何砍/留决策的最终依据
- [`docs/adr/`](docs/adr/) —— 已锁定的架构决定（Tauri+CM6 / MD Live Preview / 插件优先 / Agent 宿主）
- [`docs/architecture/overview.md`](docs/architecture/overview.md) —— 进程模型 / 模块边界 / 数据流
- [`docs/design/design-system.md`](docs/design/design-system.md) —— 设计准则 + 性能 SLO + 视觉规范
- [`docs/standards/naming.md`](docs/standards/naming.md) —— **命名规范（取自 specflow，TS + Rust 适配，强制）**
- [`docs/workflow/doc-driven-workflow.md`](docs/workflow/doc-driven-workflow.md) —— **文档驱动工作流（强制）**
- [`CONTRIBUTING.md`](CONTRIBUTING.md) —— 贡献流程 / commit 规范 / PR

## 文档驱动工作流（强制）

**每个开发任务：开工前写「Plan」文档，收工后写「Outcome」文档**，放 [`docs/progress/tasks/NNNN-<slug>.md`](docs/progress/tasks/)（模板 `TEMPLATE.md`），并同步更新 `PROGRESS.md`。目的：让任意时刻的 Codex/Claude/人类都能凭文档无缝接力。架构性改动**必须写 ADR**（[`docs/adr/`](docs/adr/)，Nygard 风格 Context/Options/Decision/Consequences，至少引 1 个同行项目）。

## 常用命令

> 骨架建立后生效（任务 #3）。约定对齐姊妹项目 `git-ai-studio`。

- `pnpm dev` —— 仅前端 Vite。`pnpm tauri:dev` —— 完整应用（Rust + webview）
- `pnpm build` —— `tsc && vite build`（前端）。`pnpm tauri build` —— 按 `tauri.conf.json` 出当前 OS 的打包目标
- `pnpm test` —— vitest 全量。单文件 `pnpm vitest run <file>`；按名 `pnpm vitest run -t "子串"`
- `pnpm typecheck` / `pnpm lint`（eslint，`--max-warnings=0`）/ `pnpm format:check`
- Rust：`pnpm rs:test` / `pnpm rs:clippy` / `pnpm rs:fmt`
- `pnpm check` —— typecheck + lint + format:check + rs:fmt + rs:clippy 全量门禁（CI 跑这一行）

## 架构

**进程模型。** Tauri 2 单进程：WebView（React 19 + CodeMirror 6，**薄渲染层**）通过 IPC 与 Rust 核心（文件 I/O、索引、ripgrep 式搜索、文件监听、子进程编排）通信。LSP 语言服务器、ACP agent、MCP server 都作为 **sidecar 子进程**按需 spawn，stdio 桥接。**铁律：重活在 Rust，WebView 只渲染**——这是达成 footprint 与延迟 SLO 的前提。详见 [`docs/architecture/overview.md`](docs/architecture/overview.md)。

**前后端边界。** 每个 Tauri command 在前端经 `src/api/ipc.ts` 的统一 `call<T>()` 封装，并按模块拆 `src/api/{模块}Api.ts`（如 `appApi.ts`）；**UI 绝不直接 `invoke`**。command 在 `src-tauri/src/lib.rs` 的 `invoke_handler!` 注册，实现在 `src-tauri/src/commands/*`。共享 TS 类型在 `src/types/`（如 `appTypes.ts`），契约测试 `src/__tests__/*.contract.test.ts` 断言 TS↔Rust 对齐。

**编辑器核心。** CodeMirror 6：按扩展名**懒加载**语言包；tree-sitter（WASM）按需加载做语法高亮；LSP 经 `@codemirror/lsp-client` 桥接 sidecar。CodeMirror 在 flex 容器里高、宽都要显式钉死（`h-full w-full` + theme `"&"` 的 width/height）。**大文件**（大尺寸/超长单行）走"只读+不换行+不高亮"模式，避免冻结 UI 线程。

**错误二分。** 预期内空态返回 `Ok(Degraded { reason })` → 前端渲染空态；真实失败返回 `Err(String)` → 红 toast（sonner）。

**跨平台。** Windows 下 `proc.rs` 之外起的子进程必须打 `CREATE_NO_WINDOW`，否则 release 闪黑色控制台。Linux WebKitGTK 碎片化是头号风险 → CI 发行版矩阵 + .deb/.rpm/AppImage。release profile 体积优化：`codegen-units=1 / lto="thin" / opt-level="s" / strip="symbols"`。

## 约定

- **命名遵循 [`docs/standards/naming.md`](docs/standards/naming.md)**（取自 specflow）：组件 PascalCase + 角色词后缀（Page/Layout/Container/Dialog/Base…）；目录按功能模块（`api/` `types/` `components/` `constants/` `hooks/` `utils/`）；函数动词+对象（禁 `getData`/`doSomething`）；常量 UPPER_SNAKE；Rust 走 idiomatic snake_case/PascalCase。命名违规视为缺陷。
- **代码注释必须中文，禁止无用注释。** 见名知义的代码不加废话注释；注释只说"是什么/为什么"，不解释"不包含什么/已删除什么"。过时未用的代码直接删，不保留。
- **双语 UI（i18next）。** 文案不硬编码；走 `src/i18n/locales/{zh-CN,en}.json`，组件用 `useTranslation()`。新增字符串同时给 zh-CN + en，en 要"自然 + 准确技术词"，不直译。
- **禁止 fallback / 兼容兜底——失败就响亮地失败。** 绝不用零值默认或静默兜底掩盖失败；坏 JSON 必须报错。命令级故障统一 `Err(String)` + 前端红 toast。（标准/初始态如 HTTP 304、空初始文件不算 fallback。）
- **性能即体验。** 延迟/footprint 的 SLO（见 design-system.md）是承诺，需尽早进 CI 门禁；**绝不在打字热路径阻塞 I/O / 网络 / agent 调用**。
- **无障碍是验收项。** 每套主题过 WCAG 2.2 AA；全键盘可操作；焦点环永不丢失。
- **Conventional Commits 不可商量**（`feat:`/`fix:`/`docs:`/`refactor:`/`perf:`/`test:`/`build:`/`chore:`）。
- **回答基于事实，禁止欺骗性/迎合性回答。** 不确定就查代码/上游文档/问用户。
- **危险操作需先确认**（删除文件/目录、数据库变更、生产调用、`git commit`/`push`）。

## 与姊妹项目 `git-ai-studio` 的关系

Glyph 复用同一团队在 `git-ai-studio` 沉淀的 Tauri 2 + React 19 + CM6 栈与工程约定（`call<T>` 封装、ADR 流程、i18n、release profile、跨平台子进程处理等）。搭骨架/写代码前可参照 `../git-ai-studio` 的实现模式保持一致，但 Glyph 是独立产品，不共享业务代码。
