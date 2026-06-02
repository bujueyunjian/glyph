# 任务 0006：性能/UX —— 语言懒加载 + 字体裁剪 + 按键架构

- 状态：🚧 进行中
- 里程碑：M1 · 关联任务：#7（TaskList）· 负责人：Claude
- 开工：2026-06-02 · 收工：—
- 缘起：群英拷问（pantheon-nexus）共识——不换语言/栈，先修工艺债；落实「用户体验高于一切、由我们引领」北极星。

---

## Plan（开工前）

### 背景 / 目标
用户感觉比 Notepad++/Typora 重。诊断：七成是 dev 构建假象 + 真实工艺债（1.1MB 包 / 字体全字集 / 每键过 React state）。本任务修掉三项真实债，并出 release 包测体积。

### 范围（三项）
1. **语言包懒加载**：`languageRegistry` 改 `import()` 动态加载，`CodeEditor` 异步装载语言 → 7 个语言包从主包剥离成按需 chunk。
2. **字体裁剪**：`main.tsx` 只引 `@fontsource-variable/geist(-mono)/latin.css`，去掉 cyrillic/vietnamese/symbols。
3. **按键架构（手感最大杠杆）**：CodeMirror 自己持有文档；`onChange` 只标脏（React 对相同 state 自动 bail-out）；保存时用 editor ref 取内容；`CodeEditor` 按文件路径 key 重挂载，规避受控 value diff。彻底去掉"每键整篇过 React state"。

### 非范围
- tree-sitter 替换（M2）、原子保存、命令面板（下一功能）。

### 验证计划
- [ ] `pnpm build` 看主包体积下降 + 语言 chunk 分离
- [ ] `pnpm lint` / `format:check`
- [ ] `pnpm tauri build` 出 release 包，记录体积
- [ ] 冷启动 / 键入延迟：**用户本地 release 包自测**（headless 无法测 GUI 延迟）

### 风险
- @uiw/react-codemirror 受控 value 与"自己持有文档"的边界：用 key=path 重挂载规避 value-diff 触发 onChange。
- fontsource 子集路径名（latin.css）需确认，错则调整。

---

## Outcome（收工后）

### 实际改动
1. **语言懒加载**：`languageRegistry` 改 `import()` 动态加载；`CodeEditor` 用 `useEffect` 异步装载语言扩展。7 个语言包从主包剥离成按需 chunk。
2. **字体**：改用 `@fontsource-variable/geist(-mono)/wght.css`（去 italic 轴 woff2）。**修正认知**：包不暴露按子集入口，但 fontsource 用 `unicode-range` 分面 → 浏览器运行时本就只下载 latin 子集，故"字体全字集拖累运行时"是误判，真正大头是语言包。
3. **按键架构（最大手感杠杆）**：CodeMirror 自己持有文档；`CodeEditor` 改 `forwardRef`、`value` 仅作初值、App 用 `key=path` 重挂载；`onChange` 只调 `markDirty`（React 对相同 `true` 自动 bail-out）；保存时经 `editorRef.current.view.state.doc` 取内容。**彻底去掉"每键整篇文档过 React state"**。
4. **额外**：整个 CodeMirror 编辑器用 `React.lazy` 懒加载——空态启动不加载编辑器内核，打开文件才拉。直接服务"启动快"。
5. 立「用户体验高于一切、由我们引领」北极星于 CLAUDE.md + design-system（措辞经用户纠正：引领用户、非服从用户）。

### 验证结果（数字）
| 指标 | 修复前 | 修复后 |
|---|---|---|
| 首屏初始 JS | 1,104 KB / gzip 377 KB（单块全量） | **366 KB / gzip 117 KB**（仅入口；约 −69% gzip） |
| Vite >500KB 警告 | 有 | **消除** |
| 语言包 | 全部打进主包 | 7 个按需 chunk（打开对应文件才下载） |
| CodeMirror 核心 | 首屏加载 | 打开文件才加载（多个 ~30–85KB chunk） |
| 每键 React 渲染 | 整篇文档过 state | 仅首次标脏一次，之后 bail-out |
| `pnpm lint` / `format` / `tsc` | — | ✅ 全绿 |
| release 二进制体积 | — | ⏳ 后台 `cargo build --release` 编译中 |
| 冷启动 / 键入延迟（GUI） | — | ⏳ 需用户本地 release 包自测 |

### 遗留 / 下一步
- 冷启动 + 键入延迟需用户本地 `pnpm tauri build` 后实测（headless 无法测 GUI）。
- M1：键入延迟 CI 门禁原型；命令面板 + Goto Anything；多标签。
- M2：tree-sitter 替换 Lezer 高亮。
