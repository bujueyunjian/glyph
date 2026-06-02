# 任务 0011：Goto Anything（文件模糊查找 + 跳行）

- 状态：🚧 进行中
- 里程碑：M1 · 关联任务：#11 · 负责人：Claude · 开工：2026-06-02
- 设计依据：准则 #3「一个栏去任何地方（文件/行/符号 前缀语法）」。

## Plan（开工前）

### 目标
`Ctrl/Cmd+P` 唤起快速打开：默认模糊查找工作区文件、回车打开；输入以 `:` 开头切跳行模式，回车跳当前文件指定行。

### 范围
- **Rust** `list_files(root)`：递归索引工作区文件，**跳过** `.git/node_modules/target/dist/build/...` + 隐藏目录，上限保护(MAX_FILES)；返回 `{path, relativePath}`，按相对路径排序。根目录不可读 → 响亮 Err；嵌套不可读子目录跳过（预期的权限/系统目录，非掩盖错误）。
- **前端**：`fsTypes.WorkspaceFile`、`workspaceApi.listFiles`、`components/command/QuickOpen.tsx`（cmdk，复用面板样式）。
  - 文件模式：cmdk 按 `relativePath` 模糊过滤；项显示文件名 + 相对路径；回车 `onOpenFile(path)`（复用 openPath，已开则激活）。
  - `:` 跳行模式：`shouldFilter=false`，单项"前往第 N 行"，回车 `onGoToLine(n)`。
  - 无文件夹时文件列表空，`:` 跳行仍可用。
- **App**：`Ctrl/Cmd+P` 唤起；`goToLine(n)` 用 activePath 的 editor view `EditorSelection.cursor + scrollIntoView`。
- i18n：`quickOpen.*`（中英）。

### 非范围
- 符号查找(`@`)、超大仓库的索引化搜索（cmdk 客户端过滤，超大仓库后续优化）、文件监听增量更新。

### 验证
- [ ] build / lint / format / tsc / cargo fmt+clippy
- [ ] GUI：Ctrl+P 搜文件打开；`:50` 跳行（用户自验）

### 风险
- 超大仓库 cmdk 客户端过滤可能卡：MAX_FILES 上限 + 后续可改索引化（记为已知限制）。

---

## Outcome（收工后）
- 状态：✅ 完成（编译/门禁层）· GUI 待用户自验

### 实际改动
- **Rust**：`commands/file.rs` 加 `WorkspaceFile{path,relativePath}` + `list_files`（DFS、跳过 .git/node_modules/target/… + 隐藏目录、MAX_FILES=20000 上限、根不可读响亮 Err、嵌套不可读跳过、按相对路径排序）；`lib.rs` 注册。
- **前端**：`fsTypes.WorkspaceFile`、`workspaceApi.listFiles`、`components/command/QuickOpen.tsx`（cmdk：文件模糊查找 / `:` 跳行双模式，复用面板样式）、`App` 加 `Ctrl/Cmd+P` 唤起 + `goToLine`（用事务 `{selection:{anchor},scrollIntoView:true}`，**不静态导入 CM 包以保首屏不含编辑器内核**）、i18n `quickOpen.*`（中英）。

### 与计划的差异 / 注意
- 初版在 App 直接 import 了 `@codemirror/state`+`@codemirror/view` → 把 CM 核心拉回首屏（触发 >500KB 警告）。改用事务规格避免静态导入，首屏回到 ~392KB/gzip 125，警告消除。
- 中途用户的 `tauri:dev` 监听在我"改完 file.rs、未改 lib.rs"之间重编译，出现过 `never used` 临时警告——注册后已消除。

### 验证
- `pnpm build` ✅ 无 >500KB 警告；`pnpm lint` / `format` / `tsc` ✅；`cargo fmt` ✅。
- GUI（`Ctrl/Cmd+P` 搜文件打开；`:50` 跳行）⏳ 用户本地自验（dev 已热更）。

### 遗留 / 下一步
- 符号查找（`@` 前缀，需 LSP/tree-sitter 符号）；超大仓库索引化搜索；文件监听增量更新索引。
- 文件树右键增删改、`.gitignore` 过滤、侧栏折叠；标签拖拽；未保存关闭确认。
