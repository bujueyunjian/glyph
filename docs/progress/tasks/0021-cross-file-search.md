# 任务 0021：跨文件搜索（ripgrep 式 Rust 后端）

- 状态：🚧 后端 + 前端落地并过 `pnpm check`；GUI 行为待显示自验
- 里程碑：M2 · 关联任务：#15（TaskList）· 负责人：Claude
- 开工：2026-06-03 · 收工：——

> 规范见 [`../../workflow/doc-driven-workflow.md`](../../workflow/doc-driven-workflow.md)。

---

## Plan（开工前）

### 背景 / 目标
M2「可日用」需跨文件搜索。重活在 Rust（铁律），用 ripgrep 的 `ignore` crate 走目录（尊重 .gitignore / 隐藏），逐文件字面量扫描；核心搜索逻辑做成可 cargo test 的纯函数。

### 范围 / 非范围
- 范围：Rust `search_files(root, query, caseSensitive)` + 前端 api/types + 搜索面板（Ctrl/⌘+Shift+F，防抖、命中跳转）。
- 非范围（后续）：正则模式、流式增量结果、替换、搜索范围过滤（按 glob）。

### 涉及文件
- `src-tauri/src/commands/search.rs`（新）+ `mod.rs` / `lib.rs` 注册 + `Cargo.toml`（`ignore`）
- `src/types/searchTypes.ts` / `src/api/searchApi.ts` / `src/components/command/SearchPanel.tsx`（新）
- `src/App.tsx`（Ctrl/⌘+Shift+F + 命令 + 命中跳转）+ i18n

### 验证计划
- [ ] cargo test：`search_in_text` 大小写/无匹配
- [ ] `pnpm check` 全绿；build + budget 首屏不破

---

## Outcome（2026-06-03）

### 实际改动
- `commands/search.rs`：`search_files`——`ignore::WalkBuilder` 遍历（尊重 .gitignore/隐藏）+ 逐文件 `search_in_text`（纯函数：字面量、大小写开关、返回 行/列/行文本，结果上限 5000、超长行截断 400）；二进制/非 UTF-8 跳过，根不可读响亮 `Err`。`mod.rs`/`lib.rs` 注册，`Cargo.toml` 加 `ignore = "0.4"`。
- 前端：`searchTypes.ts`（SearchHit camelCase 对齐）、`searchApi.ts`（`searchFiles` 经 `call<T>`）、`SearchPanel.tsx`（Radix 覆盖层，250ms 防抖、大小写开关、命中列表 `相对路径:行 + 行文本`、点击跳转）。
- `App.tsx`：`Ctrl/⌘+Shift+F` 开关 + 命令面板「跨文件搜索」+ `openHit`（打开文件后轮询等编辑器就绪再跳行，应对懒加载时序）。i18n `search.*`（中英）。

### 验证结果
- ✅ `cargo test`：`search_in_text` 3 例（大小写不敏感/敏感/无匹配）通过；完整 `pnpm check` 全绿。
- ✅ `pnpm build && pnpm perf:budget`：首屏 129.3KB / 170KB（红线守住）。
- ⏳ GUI 行为（Ctrl+Shift+F 面板、真实搜索结果、点击跳转）待显示环境自验。

### 遗留问题
- 正则模式、流式增量结果、替换、按 glob 过滤搜索范围（后续）。
- 列偏移在含非 ASCII 的大小写不敏感场景可能有微小偏差（字节 vs lowercased 字节）。

### 下一步
- 0022 文件树增删改 + notify 监听。
