# 任务 0022：文件树增删改 + notify 监听刷新

- 状态：🚧 后端 + 前端落地并过 `pnpm check`；GUI 交互待显示自验
- 里程碑：M2 · 关联任务：#16（TaskList）· 负责人：Claude
- 开工：2026-06-03 · 收工：——

> 规范见 [`../../workflow/doc-driven-workflow.md`](../../workflow/doc-driven-workflow.md)。

---

## Plan（开工前）

### 背景 / 目标
M2「可日用」需文件树增删改 + 自动刷新（含外部改动）。重活在 Rust：文件操作命令 + notify 监听经 emit 推送；前端右键菜单 + 监听刷新。

### 范围 / 非范围
- 范围：Rust create/rename/delete 命令（cargo test）+ notify 监听；前端 FileTree 右键菜单（新建文件/文件夹、重命名、删除）+ fs://changed 防抖刷新。
- 非范围：拖拽移动、剪切/复制/粘贴、回收站（永久删除前已二次确认）、targeted 局部刷新（当前整树重挂载）。

### 涉及文件
- `commands/file.rs`（create_file/create_dir/rename_path/delete_path + test）、`watch.rs`（新）、`lib.rs`、`Cargo.toml`（notify）
- `api/fileApi.ts`（CRUD）、`api/workspaceApi.ts`（watch）
- `explorer/FileTree.tsx` / `FileTreeNode.tsx`（Radix context-menu）、`common/PromptDialog.tsx`（defaultValue）、`utils/path.ts`（getDirName/joinPath + test）
- `App.tsx`（treeActions + treeVersion 刷新 + 监听 effect）+ i18n `explorer.*`

### 验证计划
- [ ] cargo test：create→rename→delete 往返 + 路径工具单测
- [ ] `pnpm check` 全绿；build + budget 首屏不破

---

## Outcome（2026-06-03）

### 实际改动
- **Rust 增删改**（`commands/file.rs`）：`create_file`（已存在不覆盖、自动建父目录）/ `create_dir` / `rename_path`（目标已存在不覆盖）/ `delete_path`（文件或目录递归，危险操作由前端二次确认）；cargo test `create_rename_delete_roundtrip`。
- **Rust 监听**（`watch.rs`）：`watch_workspace` 用 `notify` 递归监听根目录，变化经事件 `fs://changed` 推 UI；Watcher 存 `WatchState` 保活;`unwatch_workspace`。
- **前端**：`fileApi`（createFile/createDir/renamePath/deletePath）、`workspaceApi`（watchWorkspace/unwatchWorkspace）；`FileTreeNode` 接 Radix `@radix-ui/react-context-menu` 右键菜单（新建文件/文件夹、重命名、删除），`PromptDialog` 加 `defaultValue`（重命名预填）；`path.ts` 加 `getDirName`/`joinPath`（+单测）。
- **App**：`treeActions`（新建/重命名走 PromptDialog、删除走 ask 确认 → 调命令 → `treeVersion` 自增使 FileTree 重挂载刷新；删除后顺手 closeTab）；`rootPath` 监听 effect（`watchWorkspace` + 动态 import `listen` 订阅 fs://changed → 300ms 防抖刷新，不进首屏）。i18n `explorer.*`（中英）。

### 验证结果
- ✅ `cargo test`：文件操作往返 + 路径工具单测通过；完整 `pnpm check` 全绿（36 前端测试 + Rust）。
- ✅ `pnpm build && pnpm perf:budget`：首屏 130.8KB / 170KB（红线守住；事件 API 动态导入未进首屏）。
- ⏳ GUI 行为（右键菜单、新建/重命名/删除、外部改动自动刷新）待显示环境自验。

### 遗留问题
- 整树重挂载刷新会丢展开态（v1 取舍；后续做 targeted 局部刷新）。
- 拖拽移动 / 复制粘贴 / 回收站留后续。

### 下一步
- 0023 分屏。
