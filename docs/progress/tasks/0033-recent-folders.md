# 任务 0033：最近文件夹（工作区历史）

- 状态：✅ 落地并过 `pnpm check`（4 单测）+ build/budget
- 里程碑：M2 可日用 · 负责人：Claude · 开工/收工：2026-06-04

## Why
已有"最近文件",但重开**工作区文件夹**仍需每次走系统对话框翻目录。日常高频,该一键重开。

## How
- **纯函数 `utils/recentList.ts`**(4 单测):`pushRecent(list, item, max)` —— 置顶/去重/限长,不改原数组。**最近文件与最近文件夹共用**(消除重复逻辑;`useRecentFiles` 一并改用它)。
- **`useRecentFolders`**:镜像 `useRecentFiles`(localStorage `glyph.recentFolders`,上限 10,坏 JSON 响亮 toast 不静默)。
- **`useWorkspace(onOpened?)`**:打开文件夹时回调记录历史;新增 `openFolderPath(path)` 供从历史重开。
- **MenuBar**:文件菜单加"最近文件夹"子菜单(显示文件夹名,点选重开,可清除),镜像最近文件。
- 双语 i18n `file.recentFolders` / `storage.recentFoldersCorrupted`。

## 验证
- ✅ `pnpm check` 全绿(54 前端测试);build + budget 首屏在预算内。
- ✅ `pushRecent` 4 单测:置顶/去重/截断/不可变。
- ⏳ GUI(开文件夹入历史、菜单重开、清除)待显示自验。

## 备注
未扩展启动会话自动重开上次工作区(留后续,避免本增量越界);本任务只做历史记录 + 菜单重开。
