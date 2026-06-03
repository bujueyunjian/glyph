# 任务 0035：启动重开上次工作区

- 状态：✅ 落地并过 `pnpm check` + build/budget
- 里程碑：M2 可日用 · 负责人：Claude · 开工/收工：2026-06-04

## Why
会话恢复此前只重开"文件",不重开"工作区文件夹"。重启后文件树是空的,需手动再开项目——破坏连续性。"回到上次离开处"是编辑器表现"可日用"的关键体验。

## How
- `SessionState` 加 `rootPath: string | null`;`saveSession` 增参一并持久化。
- App 持久化时带上当前 `rootPath`;恢复时若有则 `openFolderPath(session.rootPath)` 重开文件树。
- 向后兼容:旧会话无 `rootPath` → 可选链 `session?.rootPath` 为 undefined → 不重开(非静默兜底,字段本就新增);路径已不存在时文件树响亮报错。

## 验证
- ✅ `pnpm check` 全绿(54 测试);build + budget 首屏在预算内。
- ⏳ GUI(重启后自动回到上次项目 + 文件)待显示自验。
