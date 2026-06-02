# ADR-0005：token 化运行时主题系统，预留主题插件与用户自定义

- 状态：✅ Accepted（2026-06-02）
- 关联：[`../design/design-system.md`](../design/design-system.md) · 任务 [`0005`](../progress/tasks/0005-theming-and-menubar.md)

## Context

用户反馈默认配色太暗，要求**多套主题 + 主题插件 + 用户自定义**。设计体系已规定 token 化语义主题、亮/暗双主题、过 WCAG 2.2 AA、加载期对比度校验。需要一个既能即时切换、又能向插件/自定义扩展的主题架构。

## Options

1. **CSS class 切换**：预定义 `.theme-dark`/`.theme-light` 类，切 body class。简单但每加一个主题要写一套 CSS，插件/自定义难。
2. **token map + 运行时写 CSS 变量**：主题 = 一组语义 token（数据），切换时把 token 写到 `documentElement` 的 CSS 变量上，覆盖 `@theme` 默认值。
3. **多份完整 CSS 文件按需加载**：体积大、不利于自定义。

## Decision

采用 **Option 2**。
- 主题是**数据**（`ThemeTokens` map），不是代码 → 插件提供主题、用户自定义主题都只需给同形 token map。
- `theme/themes.ts` 持有内置主题（`glyph-dark` 默认柔和深色 / `glyph-light` / `midnight` 纯黑）与 `applyTheme()`（写 `--color-*` + `color-scheme` + `data-theme`）。
- `hooks/useTheme.ts` 管理状态 + localStorage 持久化（后续可迁 Rust 设置）。
- CodeMirror 编辑器主题按 `theme.kind` 明暗跟随（v1 复用 `@uiw/codemirror-theme-vscode` 的 vscodeDark/Light）。
- 切换 UI 在左上角菜单栏「视图 → 主题」（Radix Menubar RadioGroup）。

### 同行佐证
- **VS Code**：主题即数据（JSON token），内置 + 市场主题同机制。
- **Zed**：主题 JSON + 用户自定义主题文件。

## Consequences

- ✅ 多主题即时切换；新增内置主题只加一个 token map。
- ✅ **插件主题 / 用户自定义主题**天然可接：未来插件/用户提供 token map 即可，无需改渲染代码。
- ✅ 默认不再纯黑，回应用户反馈。
- ⚠️ **加载期对比度校验**（WCAG 2.2 AA）尚未实现 → TODO：自定义/插件主题加载时校验并对不达标项告警（设计体系要求）。
- ⚠️ 编辑器主题 v1 仅明暗两档（vscodeDark/Light），未与应用 token 精确统一 → 后续可生成与 token 一致的 CM 主题。
- 📝 用户自定义主题文件加载、主题插件运行时随插件系统（[ADR-0003](0003-plugin-first-architecture.md)）落地（v2）。
