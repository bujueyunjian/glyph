# 任务 0010：多标签编辑

- 状态：🚧 进行中
- 里程碑：M1 · 关联任务：#10 · 负责人：Claude · 开工：2026-06-02

## Plan（开工前）

### 目标
同时打开多个文件，标签栏切换/关闭，每标签独立脏标记。**关键 UX：切换标签不丢光标/滚动/撤销历史**（北极星）。

### 方案（关键设计）
- **每个标签一个 CodeMirror 实例**：渲染全部、非激活 `display:none`，激活时 `requestMeasure()`+`focus()` 修正布局。这样各标签状态天然保留（对比"单实例换 doc"会丢撤销栈）。
- 重构 `useActiveFile` → `useEditorTabs`：`tabs: {path,initialContent,isDirty}[]` + `activePath`；用 ref 同步使回调稳定。
- `openPath`：已打开则激活，否则读文件 + 新建标签 + 激活。文件树/打开文件复用。
- `save/saveAs`：作用于激活标签；内容经 `getContent(path)` 从对应 editor ref 读。
- `closeTab`：移除并激活相邻；`Ctrl/Cmd+W` 关闭当前。
- `markDirty(path)`：已脏则返回原引用 → React bail-out,不churn。
- `TabBar` 组件：标签名 + 脏点 + hover 关闭。
- `WorkbenchLayout` 的 main 列：TabBar(置顶) + 编辑区。

### 非范围
- 标签拖拽排序、固定标签、未保存关闭确认弹窗、分屏（后续）。

### 验证
- [ ] build / lint / format / tsc
- [ ] GUI：开多个文件、切换保留光标/撤销、关闭、脏点（用户自验）

### 风险
- display:none → CM 测量失效：激活时 requestMeasure 修正。
- saveAs 改路径 = 改 key 重挂载,内容用 initialContent 保留。

---

## Outcome（收工后）
- 状态：✅ 完成（编译/门禁层）· GUI 待用户自验

### 实际改动
- 新增 `hooks/useEditorTabs.ts`（tabs + activePath，ref 同步保持回调稳定；openPath 已开则激活；save/saveAs 作用激活标签；closeTab 激活相邻；markDirty 已脏 bail-out）。**删除** `hooks/useActiveFile.ts`（被取代）。
- 新增 `components/workbench/TabBar.tsx`（标签名 + 脏点 + hover 关闭）。
- `App.tsx`：`editorRefs` Map（每标签一个 CodeMirror 实例 ref）+ `getContent(path)`；渲染全部标签的编辑器、非激活 `hidden`；激活时 `requestMeasure()`+`focus()` 修布局；`Ctrl/Cmd+W` 关闭；main 列 = TabBar + 编辑区。
- 文件树 `activePath` 跟随当前激活标签高亮。

### 关键 UX 落点
- **切换标签保留各自光标/滚动/撤销历史**（每标签独立 CM 实例，非"单实例换 doc"）——符合北极星。
- 每键仅首次标脏触发一次渲染，之后 bail-out。

### 验证
- `pnpm build` ✅ 无错误；`pnpm lint` / `format` / `tsc` ✅。无 Rust 改动。
- GUI（开多文件 / 切换保留撤销 / 关闭 / 脏点 / Ctrl+W）⏳ 用户本地自验。

### 遗留 / 下一步
- Goto Anything 文件模糊查找（`Ctrl/Cmd+P`，现已具备文件夹/标签前提）。
- 标签拖拽排序、未保存关闭确认、分屏、`WorkbenchLayout.documentLabel` 现已被 TabBar 取代（可后续清理该未用 prop）。
