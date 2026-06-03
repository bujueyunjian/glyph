# 任务 0034：行编辑动词进命令面板（注释/移动/复制/删除行）

- 状态：✅ 落地并过 `pnpm check` + build/budget
- 里程碑：M2 可日用 · 负责人：Claude · 开工/收工：2026-06-04

## Why
切换注释、上/下移行、复制行、删除行是高频编辑动作(用户明确关注多行编辑)。这些 CodeMirror 内置命令经 basicSetup 的 defaultKeymap **已能用键盘触发,但不可发现**。本产品非模态支柱是命令面板 → 应把它们暴露成可搜索的"动词"(Jobs:命令面板承载,而非埋在记忆里)。

## How
- `runLineCommand(name)`:取聚焦编辑器,**动态 import `@codemirror/commands`** 调内置命令(toggleComment/moveLineUp/moveLineDown/copyLineDown/deleteLine),不进首屏。
- 5 条命令面板项(编辑组),内联显示既有快捷键(Ctrl/⌘ / · Alt ↑↓ · Shift Alt ↓ · Ctrl/⌘ ⇧ K)作自我教学;**不新增全局快捷键**(避免与 CM defaultKeymap 双重绑定)。
- 双语 i18n `edit.*`。

## 验证
- ✅ `pnpm check` 全绿(54 测试);build + budget 首屏在预算内(纯动态 import,零首屏增量)。
- 复用 CM 官方命令 → 正确性由 CM 保证(correct-by-construction)。
- ⏳ GUI(命令面板搜到并执行)待显示自验;键盘路径本就由 defaultKeymap 提供。

## 备注
本任务为**发现性**改进:功能此前已存在(键盘),此处补齐命令面板入口,贴合非模态定位。
