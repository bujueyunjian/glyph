# 任务 0014：设置/偏好面板

- 状态：🚧 进行中
- 里程碑：M1 · 关联任务：#14 · 负责人：Claude · 开工：2026-06-02

## Plan（开工前）

### 目标
把"用户体验为核心"落到"用户能按习惯调":持久化偏好 + 设置面板,实时应用到编辑器。

### 范围（v1 设置项）
字号 / Tab 宽度 / 空格缩进(insertSpaces) / 自动换行 / 显示行号 / 连字 / 主题。

### 改动
- `types/settingsTypes.ts`:`EditorSettings` + `DEFAULT_SETTINGS`(连字默认关,符合设计准则)。
- `hooks/useSettings.ts`:localStorage 持久化 + `updateSetting` + `reset`。
- `components/settings/SettingsPanel.tsx`:Radix Dialog,原生受控控件(number/select/checkbox),用主题 token,跟随明暗。
- `CodeEditor`:接 `settings`,构建扩展——`EditorView.theme`(字号/连字)+ `EditorState.tabSize` + `indentUnit`(空格/Tab)+ 条件 `EditorView.lineWrapping` + `basicSetup={{lineNumbers}}`;改 settings 实时重配置。
- 入口:视图菜单"设置…" + `Ctrl/Cmd+,` + 命令面板;i18n `settings.*`(中英)。
- 新依赖 `@radix-ui/react-dialog`。

### 非范围
- 键位自定义、设置同步、Rust 配置文件持久化(localStorage 足够 v1)、字体族选择(先只字号)。

### 验证
- [ ] build / lint / format / tsc(无 >500KB 警告)
- [ ] GUI:改字号/Tab/换行/行号/连字实时生效 + 持久化(用户自验)

### 风险
- CodeEditor 引入 EditorView/EditorState/indentUnit 值导入——在懒加载 chunk 内,不影响首屏。

---

## Outcome（收工后）
- 状态：✅ 完成（编译/门禁层）· GUI 待用户自验

### 实际改动
- `types/settingsTypes.ts`(EditorSettings + DEFAULT,连字默认关) + `hooks/useSettings.ts`(localStorage,与默认合并防缺键)。
- `components/settings/SettingsPanel.tsx`:Radix Dialog,受控原生控件(主题/字号/Tab/空格缩进/换行/行号/连字 + 恢复默认),主题 token 跟随明暗。新依赖 `@radix-ui/react-dialog`。
- `CodeEditor`:接 `settings`,实时构建 `EditorView.theme`(字号/连字)+ `EditorState.tabSize` + `indentUnit`(空格/Tab)+ 条件 `lineWrapping` + `basicSetup={{lineNumbers}}`;改设置即重配置生效。
- `App`:useSettings + `settingsOpen` + `Ctrl/Cmd+,` + 传 settings 给每个编辑器 + 渲染面板 + 命令面板"设置"项;`MenuBar` 视图菜单加"设置…"(Ctrl/⌘ ,)。i18n `settings.*`(中英)。

### 验证
- `pnpm build` ✅ 无 >500KB 警告(编辑命令/CM 仍懒加载;面板用 Radix Dialog,首屏 +~3KB gzip)；`lint`/`format`/`tsc` ✅。
- GUI（改字号/Tab/缩进/换行/行号/连字实时生效 + 重开仍在 + 恢复默认）⏳ 用户本地自验。

### 遗留 / 下一步
- 字体族选择、键位自定义、缩进可视化、设置项搜索；Rust 配置文件持久化(跨设备)。
- 文件树右键增删改、文件监听刷新；分屏；标签拖拽。
