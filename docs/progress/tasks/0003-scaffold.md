# 任务 0003：Tauri 2 + React 19 + Vite 可运行骨架

- 状态：✅ 完成
- 里程碑：M0 · 关联任务：#3（TaskList）· 负责人：Claude
- 开工：2026-06-02 · 收工：2026-06-02

---

## Plan（开工前）

### 背景 / 目标
搭建 Glyph 的可运行骨架，验证 Tauri 2 + React 19 + Vite + Tailwind v4 + i18n + `call<T>` 前后端边界全链路打通。对齐姊妹项目 `../git-ai-studio` 的约定，最大化复用已验证模式。

### 范围
- 前端：package.json（pnpm + 同款脚本）、tsconfig(+node)、vite.config.ts、index.html、postcss、eslint/prettier、Tailwind v4 入口与基础 token、i18n（zh-CN/en）、`src/lib/api.ts` 的 `call<T>`、`src/lib/types.ts`、应用外壳 Workbench（标题区 + 空编辑区占位 + 状态栏）。
- 后端：Cargo.toml（精简依赖 + 体积优化 release profile）、tauri.conf.json、build.rs、main.rs、lib.rs（`invoke_handler!`）、`commands/app.rs`（`get_app_info`）、capabilities/default.json。
- 图标：用 PowerShell 生成 1024² 源图 → `pnpm tauri icon` 产出全套。
- 为后续任务 #4 预装 CodeMirror 6 相关依赖（一次 install 到位）。

### 非范围
- 文件读写、语法高亮（任务 #4）。
- 命令面板、多标签、LSP、AI（后续里程碑）。

### 涉及文件（关键）
- `package.json` / `vite.config.ts` / `tsconfig*.json` / `index.html` / `postcss.config.js` / `eslint.config.js`
- `src/main.tsx` / `src/App.tsx` / `src/styles.css` / `src/lib/{api,types}.ts` / `src/i18n/*` / `src/workbench/Workbench.tsx`
- `src-tauri/{Cargo.toml,build.rs,tauri.conf.json}` / `src-tauri/src/{main,lib}.rs` / `src-tauri/src/commands/{mod,app}.rs` / `src-tauri/capabilities/default.json`

### 验证计划
- [ ] `pnpm install` 成功
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm build`（前端 tsc + vite）通过
- [ ] `cargo check`（src-tauri）通过
- [ ] `pnpm tauri icon` 产出图标
- [ ] （不在 CI 环境启动 GUI；`tauri:dev` 由用户本地自验）

### 风险与对策
- 依赖版本漂移 → 直接对齐 git-ai-studio 已验证版本。
- 图标缺失致 `tauri build` 失败 → 先用 `tauri icon` 生成。
- Rust 首次编译慢 → 用 `cargo check` 验证可编译，不在本环境跑 GUI。

---

## Outcome（收工后）

### 实际改动
- **命名结构调整**（用户中途要求遵循 specflow 命名规范）：原计划的 `src/lib/{api,types}.ts` 改为 `src/api/ipc.ts` + `src/api/appApi.ts` + `src/types/appTypes.ts`；组件用角色词后缀（`WorkbenchLayout` / `StatusBar` / `EmptyState`）。新增 [`../../standards/naming.md`](../../standards/naming.md) 并回写 CLAUDE.md / overview.md / CONTRIBUTING / docs 索引。
- 前端：`package.json`、`tsconfig.json`、`tsconfig.node.json`、`vite.config.ts`、`index.html`、`postcss.config.js`、`eslint.config.js`、`.prettierrc.json`、`.gitignore`；`src/main.tsx`、`src/App.tsx`、`src/styles.css`（Tailwind v4 + 设计 token，暗色优先）；`src/api/{ipc,appApi}.ts`；`src/types/appTypes.ts`；`src/i18n/{index.ts,locales/{zh-CN,en}.json}`（一期中英）；`src/components/workbench/{WorkbenchLayout,StatusBar,EmptyState}.tsx`。
- 后端：`src-tauri/{Cargo.toml,build.rs,tauri.conf.json,.gitignore}`、`src/{main,lib}.rs`、`src/commands/{mod,app}.rs`（`get_app_info`，serde camelCase 对齐 TS）、`capabilities/default.json`、`icons/*`（由 `pnpm tauri icon` 从 `icon-source.png` 生成）。

### 与计划的差异
- 计划外：因 specflow 命名规范，调整了前端目录结构并新增命名规范文档。
- `@fontsource-variable/geist-mono` 版本 `^5.2.9`→`^5.2.8`（5.2.9 不存在）。
- `tsconfig.node.json` 补 `composite: true`、移除 `noEmit`（被引用 project 要求）。

### 验证结果（任务 #5 的全部门禁，均通过）
| 门禁 | 结果 |
|---|---|
| `pnpm install` | ✅ exit 0 |
| `pnpm tauri icon` | ✅ 全套图标生成 |
| `pnpm build`（tsc + vite） | ✅ JS 280.95 kB / gzip 88 kB，1798 模块，3.12s |
| `pnpm lint`（eslint，0 警告） | ✅（修了 1 个 `preserve-caught-error`：抛错补 `{ cause }`） |
| `pnpm format:check`（prettier） | ✅（`pnpm format` 修了 2 个文件） |
| `cargo check`（src-tauri） | ✅ Tauri 2.11.2，**无警告**，2m12s |
| `cargo fmt --check` | ✅ |
| `cargo clippy --all-targets` | ✅ 无警告 |

> 未在本环境启动 GUI（`pnpm tauri:dev` 会拉起桌面窗口，CI/headless 不适合）。骨架编译与产物均已验证；**GUI 自检请在本地 `pnpm tauri:dev`**。

### 遗留 / 下一步
- 任务 #4：第一个功能——文件读写（Rust `open_file`/`save_file` + 前端 `fileApi.ts`）+ CodeMirror 6 语法高亮（`components/editor/CodeEditor.tsx` + 语言注册）。
- 后续可补 `src/__tests__/*.contract.test.ts` 契约测试骨架。
