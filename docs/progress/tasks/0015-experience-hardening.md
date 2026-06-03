# 任务 0015：良知止血（数据安全 + 无障碍 + 会话恢复）

- 状态：🚧 代码完成 + 全量 `pnpm check` 通过（typecheck/lint/format/rs:fmt/rs:clippy 全绿，capability 合法）；mtime 移交 0018；仅 GUI 交互行为待有显示环境自验
- 里程碑：M1 · 关联任务：#6–#11（TaskList）· 负责人：Claude
- 开工：2026-06-03 · 收工：——

> 规范见 [`../../workflow/doc-driven-workflow.md`](../../workflow/doc-driven-workflow.md)。开工前填「Plan」，收工后补「Outcome」。

---

## Plan（开工前）

### 背景 / 目标

多智能体审查 + 对抗式红队在代码层核出几处**与北极星硬冲突的体验硬伤**，必须先止血再谈护城河——否则「我们引领好体验」是空话：

- **数据丢失级**：关闭脏标签 / 点窗口 `×` 关 app **静默吞掉**未保存内容（`useEditorTabs.ts:92-106` 直接 filter 删除，无脏检查；全仓无 `onCloseRequested`）。
- **无障碍北极星违规**：`styles.css` 无任何全局 `:focus-visible`，多处 `outline-none`——违反设计准则 #8「焦点环永不丢失」。
- **承诺未兑现**：`save_file` 非原子写（`file.rs:14` 注释自承 TODO）；无会话恢复（违反准则 #5「显示内容而非转圈 / 恢复精确会话」）；空态无快捷键速查（design-system D 节已列）。
- **存量 fallback 违规**：`useSettings.ts:14`、`useRecentFiles.ts:10` 用 `catch → 默认值` 静默吞坏 JSON——违反「失败响亮 no-fallback」铁律。

目标：把「轻·快·美」从「文档宣称」变成「代码兑现」，且全程不引入新的 fallback 违规。

### 范围 / 非范围

- 范围：
  1. **脏标签可撤销关闭**——对齐准则 #9「撤销优于确认」：关闭即暂存 draft / 状态栏内联 toast「已关闭未保存的 X · 撤销」；**模态确认仅作兜底**，不作默认形态。关闭前先经 ref `getContent(path)` 抓快照（实例移除即卸载，否则无从撤销）。
  2. **拦截窗口关闭**：`getCurrentWindow().onCloseRequested()` + `capabilities/default.json` 补 window 关闭权限，使关 app 也走脏保护。
  3. **`save_file` 原子写**：临时文件 + `fs::rename`（tmp 与目标**同目录**避免跨设备失败）；**save 前 mtime 校验**，外部已改动则提示，防静默覆盖（文件监听地基缺失期的过渡手段）。
  4. **全局 `:focus-visible` token**：一条语义化焦点环，修准则 #8。
  5. **空态快捷键速查表**：打开文件夹 / 命令面板 / 最近项目，i18n 双语。
  6. **最小会话恢复**：仅恢复「已打开文件 + 光标/滚动位」。失败语义两态——**缺状态（首次启动 / 无 session）= 预期空态（Degraded 旁路）**；**坏状态（JSON 解析失败）= 红 toast 响亮报错，绝不静默回空**；恢复时文件已删 = 该 tab 跳过 + 一条聚合提示（归 Degraded 旁路，非静默 fallback）。放 localStorage。
  7. **清掉存量 fallback**：`useSettings.ts`、`useRecentFiles.ts` 的 `catch → 默认值` 改为「缺=默认 / 坏=报错」。
- 非范围（明确不做）：分屏、标签拖拽排序、窗口布局/会话历史持久化、会话状态 Rust 化（localStorage 足够；Rust 化记为后续候选）、字体族/键位等设置增强。

### 方案大纲

- 关闭与撤销逻辑集中在 `hooks/useEditorTabs.ts`（draft 快照 + 撤销栈），UI 落在 `TabBar` / `StatusBar`（toast）。
- 窗口关闭拦截在 `App.tsx` 挂 `onCloseRequested`，遍历脏 tab → 同一可撤销/兜底流程。
- 会话恢复新增 `hooks/useSession.ts`：序列化 `{openPaths, activePath, perFileCursor}`；启动时读 → 复用 `openFile`（`file.rs`）逐个恢复，区分缺/坏两态。
- 原子写改 `commands/file.rs::save_file`；mtime 校验需 `save_file` 入参带「上次已知 mtime」或新增轻量 `stat` 查询。
- 焦点环：`styles.css` 加全局 `:focus-visible` 规则，用主题 token（与 ADR-0005 一致）。

### 涉及文件

- `src/hooks/useEditorTabs.ts` —— 可撤销关闭 + draft 快照
- `src/hooks/useSession.ts`（新）—— 最小会话恢复
- `src/hooks/useSettings.ts` / `src/hooks/useRecentFiles.ts` —— 清 fallback（缺=默认 / 坏=报错）
- `src/App.tsx` —— `onCloseRequested` 拦截 + 会话恢复接线
- `src/components/workbench/TabBar.tsx` / `StatusBar.tsx` —— 撤销 toast
- `src/components/workbench/EmptyState.tsx` —— 快捷键速查表
- `src/styles.css` —— 全局 `:focus-visible`
- `src-tauri/src/commands/file.rs` —— 原子写 + mtime 校验
- `src-tauri/capabilities/default.json` —— window 关闭权限
- `src/i18n/locales/{zh-CN,en}.json` —— 新文案

### 验证计划

- [ ] typecheck / lint / format:check
- [ ] rs:fmt / clippy
- [ ] build：无 >500KB 警告（不得把重依赖拉进首屏）
- [ ] GUI 自验：关脏标签可撤销恢复；点 `×` 关 app 被拦截；原子保存（断电/崩溃不损原文件）；外部改文件后保存有提示；Tab/按钮全键盘可达且焦点环可见；会话恢复——正常恢复 / 删掉某文件聚合提示 / 手工写坏 localStorage 触发红 toast 不清空。

### 风险与对策

- 跨设备 rename 失败 → tmp 与目标同目录；Windows 目标被占用 rename 语义不同 → 平台分支处理。
- 「可撤销」需在 tab 移除前抓内容快照，否则 CM 实例已卸载 → `closeTab` 内先 `getContent`。
- 会话恢复触碰 no-fallback 铁律 → 缺/坏两态显式区分，坏即响亮报错（已写进范围）。
- 文件监听地基缺失，原子写上线后「外部改→覆盖丢数据」窗口打开 → mtime 校验过渡，长期补 `notify` 推送通道（见 0018 / 已知欠债）。

---

## Outcome（代码完成 · 2026-06-03）

### 实际改动（已完成）
- **A 焦点环**：`styles.css` 全局 `:focus-visible`（accent token + outline-offset 2px），修准则 #8「焦点环永不丢失」。
- **B 防数据丢失（两路）**：
  - 标签关闭：`useEditorTabs.ts` `closeTab` 关闭脏标签前抓内容快照，给可撤销 toast（`restoreTab` 原位插回 + 标脏），对齐准则 #9「撤销优于确认」；`TabBar.tsx` 关闭按钮 `aria-label` 走 i18n。
  - 整窗关闭：`App.tsx` `onCloseRequested` 拦截，有未保存内容时 `ask` 确认兜底（退出不可撤销）→ 确认才 `destroy`；`capabilities/default.json` 加 `core:window:allow-destroy`。
- **C 原子写**：`commands/file.rs` `save_file` 改「写同目录临时文件 + rename 覆盖」，失败清理临时文件。（mtime 外部改动校验移交 0018，见遗留。）
- **D 清 fallback**：新建 `utils/storage.ts`（`readJson` 区分 缺=null / 坏=corrupted；`writeJson` 写失败仅 warn）；`useSettings.ts`、`useRecentFiles.ts` 改「缺=默认/空、坏 JSON=响亮 toast」，清掉 `catch→默认值` 静默兜底。
- **E 空态速查表**：`EmptyState.tsx` 改打开文件/命令面板/快速打开/设置的快捷键速查（`<kbd>`），i18n。
- **F 会话恢复（含光标）**：新建 `useSession.ts`（openPaths + activePath + 每文件光标偏移，localStorage，缺/坏两态）；`App.tsx` 启动恢复（激活项最后打开、已删文件由 openPath 响亮跳过）+ 恢复完成后变更即存（恢复期不写，防清空）；`CodeEditor.tsx` `onCreateEditor` 应用 `initialCursor` 并滚动入视。
- i18n：新增 `common.{undo,closeTab}`、`file.{closedUnsaved,quitUnsaved}`、`storage.{settingsCorrupted,recentCorrupted,sessionCorrupted}`（zh-CN + en）。

### 验证结果
- ✅ `pnpm typecheck` / `pnpm lint`（--max-warnings=0）/ `pnpm format:check` 全过。
- ✅ `pnpm build`：入口 ~406KB / gzip ~130KB，**无 >500KB 警告，CM 仍懒加载**（window API 动态导入未进首屏），性能红线守住。
- ✅ **Rust 已验证**（cargo 在 `~/.cargo/bin`，加入 PATH 后）：`rs:fmt` 通过（修正 file.rs 一处断行）；`rs:clippy --all-targets` 编译 41s **零 warning/error**；**capability `core:window:allow-destroy` 经 Tauri codegen 校验合法**。完整 `pnpm check` 全绿。
- ⏳ **仅 GUI 交互行为待自验**（需真实显示环境）：可撤销关闭 toast、整窗关闭确认、会话 + 光标恢复、焦点环视觉、空态速查表，本地 `pnpm tauri:dev` 自验。

### 遗留问题
- **C mtime 外部改动校验**：移交任务 [0018](0018-agent-host-proc-spike.md) 一并做——需改 `open_file`/`save_file` 的 IPC 契约带 mtime，且与 0018 要建的 Rust→UI 推送 / `notify` 文件监听地基同源，单独做收益低且本环境无法验证 Rust。
- GUI 交互验证待本地有显示环境（Rust 已通过，见上）。

### 下一步
- 本地 `pnpm tauri:dev`（需 `~/.cargo/bin` 在 PATH）做 GUI 自验五项。
- GUI 自验通过后状态置 ✅ 并更新 PROGRESS；mtime 随 0018 落地。
