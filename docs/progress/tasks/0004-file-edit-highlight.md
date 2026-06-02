# 任务 0004：第一个功能——文件读写 + 语法高亮

- 状态：✅ 完成（编译/门禁层）· GUI 待用户自验
- 里程碑：M0 · 关联任务：#4（TaskList）· 负责人：Claude
- 开工：2026-06-02 · 收工：2026-06-02

---

## Plan（开工前）

### 背景 / 目标
让 Glyph 从"空壳"变成真能编辑代码：打开任意文本/代码文件 → CodeMirror 6 渲染 + 按扩展名语法高亮 → 编辑（脏标记）→ 保存。验证核心编辑链路与前后端边界。

### 范围
- **后端**：`commands/file.rs` 的 `open_file(path)->Result<String,String>`、`save_file(path,content)->Result<(),String>`（失败响亮 Err），在 `lib.rs` 注册。
- **前端**：
  - `api/fileApi.ts`：`openFile/saveFile` 封装；用 `@tauri-apps/plugin-dialog` 选路径。
  - `utils/path.ts`：`getFileName/getFileExtension`。
  - `components/editor/languageRegistry.ts`：扩展名 → CodeMirror 语言扩展（js/ts/json/rust/markdown/css/html/python）。
  - `components/editor/CodeEditor.tsx`：`@uiw/react-codemirror` 封装（vscodeDark 主题，高/宽钉死）。
  - `hooks/useActiveFile.ts`：管理 {path,content,dirty} + open/save/updateContent。
  - `WorkbenchLayout`：补 `documentLabel` + `actions`（头部右侧打开/保存按钮）。
  - `App`：组合上述 + Ctrl/Cmd+O / Ctrl/Cmd+S 快捷键 + 文件打开时渲染编辑器、否则空态。
  - i18n：补 `file.*` 文案（中英）。
- **附带**：把过暗的设计 token 对比度调清楚（响应"黑屏/全黑"反馈）。

### 非范围
- tree-sitter WASM 高亮（v1 先用 CodeMirror 自带 Lezer 语言高亮，tree-sitter 留 M2）、LSP、命令面板、多标签、Markdown Live Preview。
- 原子保存（temp+rename）留 M1 硬化；v1 用 `fs::write`（注释标注）。

### 验证计划
- [ ] `pnpm build`（tsc + vite）
- [ ] `pnpm lint` / `format:check`
- [ ] `cargo check` / `clippy` / `fmt`
- [ ] 本地 `pnpm tauri:dev`：打开/编辑/保存 + 高亮闭环（用户自验 GUI）

### 风险
- CodeMirror 在 flex 容器需显式高宽（`h-full w-full` + height="100%"）。
- 黑屏根因待用户用 Console 区分（渲染失败 vs 太暗）。

---

## Outcome（收工后）

### 实际改动
- **后端**：`src-tauri/src/commands/file.rs`（`open_file`/`save_file`，失败响亮 `Err`）；`commands/mod.rs`、`lib.rs` 注册。
- **前端**：`src/api/fileApi.ts`、`src/utils/path.ts`（`getFileName`/`getFileExtension`）、`src/components/editor/languageRegistry.ts`（扩展名→语言）、`src/components/editor/CodeEditor.tsx`（@uiw/react-codemirror + vscodeDark）、`src/hooks/useActiveFile.ts`（open/save/updateContent + 脏标记 + 红 toast）、`src/components/common/BaseButton.tsx`、改写 `WorkbenchLayout`（documentLabel + actions）、改写 `App`（组合 + Ctrl/Cmd+O/S 快捷键 + 编辑器/空态切换）、i18n `file.*`（中英）。
- **设计**：提升 chrome 对比度（surface/overlay/border 调亮），响应"全黑"反馈。

### 验证结果（全部门禁，均通过）
| 门禁 | 结果 |
|---|---|
| `pnpm build` | ✅ 4.79s。**但 JS 暴涨到 1,024 kB / gzip 350 kB**（见下「遗留」） |
| `pnpm lint` | ✅ 0 警告 |
| `pnpm format:check` | ✅（`pnpm format` 修了 3 文件） |
| `cargo fmt --check` | ✅（`cargo fmt` 已对齐） |
| `cargo clippy --all-targets` | ✅ 无警告 |
| GUI 闭环（打开/编辑/保存/高亮） | ⏳ **待用户本地 `pnpm tauri:dev` 自验** |

### 遗留问题（如实记录）
1. **🔴 包体积回归**：`languageRegistry.ts` 静态导入 7 个 CodeMirror 语言包，使首屏 JS 从 281KB 涨到 1,024KB（gzip 350KB），触发 Vite >500KB 警告。**违背"按语言懒加载"的轻量 SLO**。→ 待办（M2 优先）：改 `import()` 动态懒加载语言包 + 引入 tree-sitter；`getLanguageExtension` 改 async，`CodeEditor` 异步装载语言。
2. **黑屏根因未定**：已提升对比度 + 加入真实编辑器内容，但 GUI 是否真渲染需用户确认（看到工具栏/编辑器 = 正常；仍全黑 = 需 Console 报错）。
3. 原子保存（temp+rename）未做，v1 用 `fs::write`（M1 硬化）。
4. 未加契约测试 / 单测（后续补）。

### 下一步
- 用户 `pnpm tauri:dev` 自验：打开文件→高亮→编辑→保存→toast。
- 若 GUI 正常：M0 收官，进入 M1（性能门禁原型 / 命令面板 / 多标签）。
- 优先排期遗留 #1（语言懒加载）以守住轻量 SLO。
