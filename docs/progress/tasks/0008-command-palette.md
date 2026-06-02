# 任务 0008：命令面板（Ctrl/Cmd+Shift+P）

- 状态：🚧 进行中
- 里程碑：M1 · 关联任务：#8 · 负责人：Claude · 开工：2026-06-02
- 设计依据：准则 #3「一个栏去任何地方 + 自我教学快捷键」；北极星「用户体验高于一切」。

## Plan（开工前）

### 目标
做「一个栏」的命令侧：`Ctrl/Cmd+Shift+P` 唤起，模糊搜索并执行所有命令，内联显示快捷键。最能让人瞬间感到"专业编辑器"的体验杠杆。

### 范围
- `src/components/command/CommandPalette.tsx`：基于 cmdk 的 `Command.Dialog`，输入 + 列表 + 分组 + 空态，选中执行后关闭。
- 命令模型：`{ id, title, group, shortcut?, perform }`；App 据当前能力构建（打开/保存/另存为 + 每个主题一条切换命令）。
- 键盘：在 App 全局 keydown 加 `Ctrl/Cmd+Shift+P` 唤起。
- 样式：用 cmdk data-attributes 在 `styles.css` 用主题 token 定制（跟随明暗、无动画噪音、遵守 reduced-motion）。
- i18n：`command.placeholder` / `command.empty`（中英）。

### 非范围（下一步）
- Goto Anything 的**文件模糊查找**：需先有"打开文件夹 + 文件树/索引"才有东西可搜 → 随文件树功能做。
- Go to Line（`:` 前缀）/ 符号（`@`）：紧随其后。
- 多标签。

### 验证
- [ ] build / lint / format / tsc
- [ ] 本地 GUI：Shift+P 唤起、模糊搜、回车执行、主题即时切换（用户自验）

### 风险
- cmdk Dialog 的 overlay/dialog 定位与 z-index：用 data-attribute CSS 控制。
- 命令 perform 在 !file 时的保护（save/saveAs 无文件时安全 no-op）。

---

## Outcome（收工后）
- 状态：✅ 完成（编译/门禁层）· GUI 待用户自验

### 实际改动
- 新增依赖 `cmdk`。
- `src/types/commandTypes.ts`：`CommandAction` 类型。
- `src/components/command/CommandPalette.tsx`：cmdk `Command.Dialog`，按 group 分组、模糊搜索、选中执行后关闭、内联快捷键。
- `styles.css`：用主题 token 定制 cmdk（overlay/dialog/input/list/item/group），跟随明暗、无装饰动画。
- `App.tsx`：`paletteOpen` 状态、`commands` 命令集（打开/保存/另存为 + 每个主题一条切换）、`Ctrl/Cmd+Shift+P` 切换、渲染面板、引入 `useTranslation`。
- i18n：`command.{title,placeholder,empty}`（中英）。

### 验证
- `pnpm build` ✅ 无错误；初始入口 366→384KB / gzip 117→123KB（+cmdk，仍远低于早先 1104KB）。
- `pnpm lint` / `format` / `tsc` ✅。
- GUI（Shift+P 唤起 / 模糊搜 / 回车执行 / 切主题）⏳ 用户本地自验。

### 遗留 / 下一步
- **Goto Anything 文件模糊查找**：需先有"打开文件夹 + 文件树/索引"才有东西可搜 → 随文件树功能做（下一步建议）。
- Go to Line（`:`）/ 符号（`@`）前缀导航；多标签。
- 可选：命令面板本身 lazy-load（当前为即时唤起保持 eager）。
