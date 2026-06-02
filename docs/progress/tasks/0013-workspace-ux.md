# 任务 0013：工作区 UX 完善

- 状态：🚧 进行中
- 里程碑：M1 · 关联任务：#13 · 负责人：Claude · 开工：2026-06-02
- 缘起：用户反馈 4 点——侧栏不能关、文件名太长看不到、想要最近打开、顶部菜单太少。

## Plan（开工前）

### 范围
1. **侧栏开关 + 关闭文件夹**：`Ctrl/Cmd+B` 收起/展开侧栏；`useWorkspace.closeFolder` 回到无工作区。
2. **侧栏拖宽 + 长文件名**：`WorkbenchLayout` 内置可拖拽分隔条改宽度（localStorage 持久化，clamp 160–480）；`FileTreeNode` 加 `title` 悬浮显示全名。
3. **最近打开文件**：`hooks/useRecentFiles`（localStorage，上限 12）；`useEditorTabs.openPath` 成功后回调 `onFileOpened`；File 菜单"最近打开"子菜单。
4. **菜单扩充**：File（打开/打开文件夹/最近▸/关闭文件夹/保存/另存为）、Edit（撤销/重做/查找——经 active editor view **动态导入** `@codemirror/commands`/`search`，不污染首屏）、View（切换侧栏/主题▸）、Help（关于/版本）。i18n 中英。

### 非范围
- 完整设置面板（字号/键位/缩进等持久化偏好）——后续单独做；本轮"设置"先以 View 内主题 + 菜单结构呈现。
- 侧栏拖拽用 Radix Resizable/第三方——本轮手写 mousemove 即可（轻量）。

### 验证
- [ ] build / lint / format / tsc
- [ ] GUI：Ctrl+B 开关、拖宽、关文件夹、最近打开、各菜单项（用户自验）

### 风险
- Edit 菜单命令需 CM 函数：用 `import()` 动态加载(编辑器 chunk 已载,瞬时),避免把 CM 拉回首屏。
- 拖拽 width 闭包陈旧：用 ref 存最新值再持久化。

---

## Outcome（收工后）
- 状态：✅ 完成（编译/门禁层）· GUI 待用户自验

### 实际改动
- **侧栏开关**：`sidebarVisible` + `Ctrl/Cmd+B` + 视图菜单；侧栏 = `rootPath && sidebarVisible`。
- **关闭文件夹**：`useWorkspace.closeFolder`；文件菜单"关闭文件夹"。
- **侧栏拖宽**：`WorkbenchLayout` 内置拖拽分隔条(160–480,localStorage 持久化,ref 防陈旧)；`FileTreeNode` 加 `title` 悬浮显示长文件名全名。
- **最近打开**：`hooks/useRecentFiles`(localStorage,上限 12,去重置顶)；`useEditorTabs` 加 `onFileOpened` 回调,App 传 `addRecent`(树/对话框/QuickOpen/最近 所有打开都记录)；文件菜单"最近打开"子菜单 + 清除。
- **菜单扩充**：`MenuBar` 重写为 文件/编辑/视图/帮助。编辑(撤销/重做/查找)经 `activeView` + **动态 import** `@codemirror/commands`/`search`(不污染首屏)；帮助"关于"弹版本。i18n `menu.edit/help`、`edit.*`、`view.*`、`help.*`、`file.recent*/closeFolder`(中英)。

### 关于"设置"
本轮把可见设置(主题/侧栏)归入视图菜单,菜单补全为 4 个。**完整偏好面板**(字号/缩进/键位持久化)记入路线图后续单独做。

### 验证
- `pnpm build` ✅ 无 >500KB 警告(编辑命令走动态 chunk)；`lint`/`format`/`tsc` ✅；无 Rust 改动。
- GUI（Ctrl+B / 拖宽 / 关文件夹 / 最近打开 / 各菜单 / 撤销重做 / Ctrl+F）⏳ 用户本地自验。

### 遗留 / 下一步
- 完整设置面板(偏好持久化)；文件树右键增删改、文件监听刷新、`.gitignore` 过滤；标签拖拽/未保存关闭确认；分屏。
