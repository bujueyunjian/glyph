# 任务 0005：主题系统 + 应用菜单栏

- 状态：✅ 完成（编译/门禁层）· GUI 待用户自验
- 里程碑：M1 · 关联任务：#6（TaskList）· 负责人：Claude
- 开工：2026-06-02 · 收工：2026-06-02

---

## Plan（开工前）

### 背景 / 目标
用户反馈：① 默认太暗，需多主题 + 主题插件 + 用户自定义；② 文件操作应在左上角菜单（主流做法，功能多了好扩展）。

### 范围
**主题系统**
- `src/theme/themes.ts`：主题类型 + 内置主题注册表（深色默认/浅色/Midnight 纯黑）+ `applyTheme()`（运行时把 token 写到 `documentElement` 的 CSS 变量 + `color-scheme`）。
- `src/hooks/useTheme.ts`：当前主题状态、切换、localStorage 持久化、挂载即应用。
- 默认换成**柔和深色**（不再纯黑）；编辑器主题（CodeMirror）跟随明暗。
- 预留**主题插件 + 用户自定义**架构（ADR-0005）：主题即 token map（数据），加载期对比度校验留 TODO。

**菜单栏（左上角）**
- `src/components/workbench/MenuBar.tsx`：Radix Menubar。**文件**（打开/保存/另存为，内联快捷键）+ **视图**（主题单选切换）。
- `WorkbenchLayout` 头部左侧放 MenuBar，替代原工具栏按钮（移除 BaseButton 工具栏用法，保留组件备用）。
- `useActiveFile` 补 `saveAs()`（始终弹另存对话框）。
- i18n 菜单文案（中英）。

### 非范围
- 用户自定义主题文件加载、主题插件运行时（v2，随插件系统）；加载期对比度校验器（TODO）。
- macOS 原生菜单栏（v1 用应用内菜单，跨平台一致；原生菜单留后续）。

### 验证计划
- [ ] `pnpm build` / `lint` / `format:check`
- [ ] `cargo` 侧无改动（本任务纯前端）
- [ ] 本地 GUI：切主题即时生效 + 菜单文件操作可用（用户自验）

### 风险
- Radix Menubar 无样式，需 Tailwind 定制 + 保证键盘可达（无障碍）。
- 运行时 CSS 变量覆盖 `@theme` 默认值：靠 `documentElement` 内联样式优先级覆盖。

---

## Outcome（收工后）

### 实际改动
- **主题系统**：`src/theme/themes.ts`（`ThemeTokens`/`Theme` 类型 + 内置 glyph-dark/glyph-light/midnight + `applyTheme`）、`src/hooks/useTheme.ts`（状态 + localStorage 持久化 + 挂载即应用）；`styles.css` `@theme` 默认值改为 glyph-dark（首屏不再纯黑）；`CodeEditor` 主题随 `themeKind` 明暗跟随；`Toaster` 主题跟随。新增 [ADR-0005](../../adr/0005-theming-system.md)，更新 design-system「颜色与主题」。
- **菜单栏**：新增依赖 `@radix-ui/react-menubar`；`src/components/workbench/MenuBar.tsx`（文件：打开/保存/另存为 + 内联快捷键；视图：主题单选）；`WorkbenchLayout` 头部左侧放菜单、文档名居中；`App` 组合 useTheme + MenuBar，快捷键补 Ctrl/Cmd+Shift+S 另存为；`useActiveFile` 补 `saveAs()`。
- i18n：补 `menu.*` + `file.saveAs`（中英）。
- `BaseButton` 不再被 App 使用（保留为基础 UI 备用）。

### 验证结果
| 门禁 | 结果 |
|---|---|
| `pnpm build` | ✅ 4.85s（JS 1,104 kB / gzip 377 kB——见遗留 #1） |
| `pnpm lint` | ✅ 0 警告 |
| `pnpm format:check` | ✅ |
| GUI（切主题即时生效 + 菜单文件操作） | ⏳ 待用户本地 `pnpm tauri:dev` 自验 |

### 遗留问题
1. **🔴 包体积**（沿任务 #4）：语言包静态导入 + 新增 Radix，JS 已 1.1MB。M2 优先改语言包懒加载。
2. 加载期主题对比度校验器未实现（WCAG AA，设计体系要求）→ TODO。
3. 编辑器主题 v1 仅明暗两档（vscodeDark/Light），未与应用 token 精确统一。
4. 用户自定义主题文件 / 主题插件随插件系统（v2）。

### 下一步
- 用户自验：菜单「视图→主题」切换深色/浅色/Midnight 即时生效；「文件」菜单打开/保存/另存为可用。
- 建议接着排：语言包懒加载（修体积）/ 命令面板 / 多标签。
