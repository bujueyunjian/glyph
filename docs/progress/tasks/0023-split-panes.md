# 任务 0023：分屏（编辑器双面板）

- 状态：🚧 落地并过 `pnpm check`；GUI 行为待显示自验
- 里程碑：M2 · 关联任务：#17（TaskList）· 负责人：Claude
- 开工：2026-06-03 · 收工：——

> 规范见 [`../../workflow/doc-driven-workflow.md`](../../workflow/doc-driven-workflow.md)。用户确认「盲做（我实现 + CI 编译验证，你验行为）」。

---

## Plan / 方案

**低风险方案**：主面板的 `activePath`/`editorRefs`/会话/变换逻辑**全部不动**；分屏作为**附加的第二面板**，`save`/`undo`/`redo`/`find`/行变换按**聚焦面板**路由。避免重写编辑器核心（降低回归风险）。

## Outcome（2026-06-03）

### 实际改动
- `useEditorTabs.ts`（最小改动）：`save(path)`/`saveAs(path)` 改显式 path；`openPath(path, activateTab=true)` 加是否激活主面板的开关;其余(activePath/closeTab/restore/markDirty/reorder)不变。
- `App.tsx`：
  - `splitRefs`(分屏实例)+ `focusedPaneRef`/`focusedPane`;`getContent`/`activeView` 按聚焦面板取实例。
  - `effectiveActive`(聚焦面板当前文件)驱动 save/undo/find/变换 + TabBar 高亮 + canSave。
  - `doSave`/`doSaveAs`/`openInFocused`(开进聚焦面板)/`toggleSplit`(Ctrl/⌘+\\)/`closeTabSynced`。
  - 编辑区改 flex 行:主面板 + 分屏面板(splitPath 时)+ 预览;面板 `onMouseDownCapture` 设聚焦。
  - 命令面板「切换分屏」;FileTree/QuickOpen/最近文件 → `openInFocused`。i18n `view.split`。

### 验证结果
- ✅ 完整 `pnpm check` 全绿(40 前端测试 + Rust)。
- ✅ build + budget：首屏 132.2KB / 170KB,红线守住。
- ⏳ GUI 行为(分屏切换、双面板编辑、聚焦路由保存/查找)待显示环境自验。

### 已知限制（v1，已记录）
- **同一文件在主+分屏双开会各持独立实例,内容会分叉**(save 按聚焦面板)。分屏主要用于并排不同文件;同文件双开请注意。
- 分屏状态不持久化到会话(v1);行变换/查找按聚焦面板,QuickOpen 跳行/搜索跳转仍作用主面板。
- 仅 2 面板、水平分屏;拖拽落点/键盘驱动更细的分屏留后续。

### 下一步
- 剩余里程碑(LSP/M4 端到端/行内 Live Preview/键入延迟尺子)需语言服务器/agent CLI/显示环境。
