# 任务 0009：打开文件夹 + 文件树侧栏

- 状态：🚧 进行中
- 里程碑：M1 · 关联任务：#9 · 负责人：Claude · 开工：2026-06-02

## Plan（开工前）

### 目标
让 Glyph 从"单文件"变"能管项目"：打开文件夹 → 左侧文件树 → 点文件即在编辑器打开。这是 Goto Anything 文件查找与多标签的前提。

### 范围
- **Rust**：`list_dir(path) -> Result<Vec<DirEntry>,String>`（`DirEntry{name,path,isDir}`，目录优先 + 名称不分大小写排序）。**逐级懒读**（展开才读子级），不递归，避免大目录卡顿。
- **前端**：
  - `types/fsTypes.ts`：`DirEntry`。
  - `api/workspaceApi.ts`：`listDir(path)`。
  - `hooks/useWorkspace.ts`：`{ rootPath, openFolder }`（目录对话框）。
  - `components/explorer/FileTree.tsx` + `FileTreeNode.tsx`：懒展开、目录折叠、点文件 `onOpenFile(path)`、当前文件高亮。
  - `hooks/useActiveFile.ts`：加 `openPath(path)`（按已知路径打开，复用于 `open()` 与文件树）。
  - `WorkbenchLayout`：加可选左侧栏 `sidebar`（有文件夹才显示）。
  - `MenuBar` + 命令面板：加"打开文件夹"。
  - i18n：`file.openFolder` / `explorer.readFailed`。

### 非范围（后续）
- 多标签、Goto Anything 文件查找（下一步）、文件增删改右键菜单、文件监听自动刷新、`.gitignore` 过滤。

### 验证
- [ ] build / lint / format / tsc / clippy
- [ ] 本地 GUI：打开文件夹 → 树展开 → 点文件打开 + 高亮（用户自验）

### 风险
- 大目录：逐级懒读规避；监听刷新留后续。
- 读目录失败：fail-loud 弹红 toast，不静默兜底。

---

## Outcome（收工后）
- 状态：✅ 完成（编译/门禁层）· GUI 待用户自验

### 实际改动
- **Rust**：`commands/file.rs` 加 `DirEntry{name,path,isDir}` + `list_dir`（目录优先 + 名称不分大小写排序，逐级懒读）；`lib.rs` 注册。
- **前端**：`types/fsTypes.ts`、`api/workspaceApi.ts`（listDir）、`hooks/useWorkspace.ts`（rootPath + openFolder 目录对话框）、`components/explorer/{FileTree,FileTreeNode}.tsx`（懒展开、目录优先、点文件即开、当前文件高亮、读失败弹红 toast）、`useActiveFile` 加 `openPath`（open 复用之）、`WorkbenchLayout` 加可选 `sidebar`、`MenuBar` + 命令面板加"打开文件夹"、i18n `file.openFolder` / `explorer.readFailed`（中英）。

### 验证
- `pnpm build` ✅ 无错误；`pnpm lint` / `format` / `tsc` ✅；`cargo fmt` / `clippy` ✅ 无警告。
- GUI（打开文件夹 → 树懒展开 → 点文件打开 + 高亮）⏳ 用户本地自验。

### 遗留 / 下一步
- 多标签（同时开多个文件）。
- Goto Anything 文件模糊查找（`Ctrl/Cmd+P`，现已有文件夹/索引前提）。
- 文件监听自动刷新、右键增删改、`.gitignore` 过滤、侧栏折叠快捷键。
