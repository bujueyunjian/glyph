# 任务 0026：标签拖拽排序（M2）

- 状态：🚧 落地并过 `pnpm check`；拖拽行为待显示自验
- 里程碑：M2 · 关联任务：—（TaskList）· 负责人：Claude
- 开工：2026-06-03 · 收工：——

## Plan / Outcome（2026-06-03）

### 目标 / 改动
roadmap M2「标签拖拽」。纯增量、低回归、可编译验证。
- `utils/array.ts`:纯 `moveItem(items, from, to)`(同位/越界原样返回)+ 单测 3 例。
- `hooks/useEditorTabs.ts`:`reorderTabs(from, to)` 经 `moveItem` + `writeTabs`。
- `components/workbench/TabBar.tsx`:标签 `draggable` + `onDragStart/onDragOver/onDrop` → `onReorder`;`App.tsx` 透传 `reorderTabs`。

### 验证结果
- ✅ `pnpm check` 全绿(40 前端测试,含 moveItem)；build + budget 首屏 131.8KB / 170KB,红线守住。
- ⏳ 实际拖拽手感待显示环境自验。

### 遗留
- 拖拽落点视觉指示(当前无高亮);跨窗口/分屏拖拽随分屏(0023)。
