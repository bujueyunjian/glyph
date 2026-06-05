# 任务 0050：新建文件 + Markdown 预览顺手化 + Mermaid 图 + 修正 agent 默认命令

- 状态：✅ 完成
- 里程碑：M1/M3/M4 · 关联任务：#24-#27（TaskList）· 负责人：Claude
- 开工：2026-06-05 · 收工：2026-06-05

> 用户真机反馈三条 + 一个真机定位出的 bug：① 文件菜单要有「新建文件」；② md 要更顺手地展示，不必每次手动点预览；
> ③ md 的图（如 mermaid flowchart）显示不出来；④ agent 报「未找到 claude-agent-acp」。

---

## Outcome

### ④ 修正 agent 默认命令（根因：误信 GitHub HEAD）
真机 `Get-Command` + npm registry 双重核实：发布版 `@zed-industries/claude-code-acp@0.14–0.16` 的 bin **是 `claude-code-acp`**，
而非早先据 **GitHub HEAD 的 package.json** 误判的 `claude-agent-acp`（HEAD 改名未发布）。全量改默认/提示/报错/README/ADR/任务doc。
**教训**：核 bin 名必须查 npm registry 已发布版本。

### ① 新建文件（VS Code 式无标题缓冲）
- `useEditorTabs`：`newUntitled()` 建合成路径 `Untitled-N` 的空缓冲 + `isUntitled()`。首次保存（`doSave` 检测 untitled）走另存为落盘。
- 文件菜单顶部「新建文件」+ `Ctrl/⌘+N` + 命令面板。无标题缓冲不进会话持久化（无磁盘文件，重启读盘必失败）。
- Playwright 验：⌘N → 出现 Untitled-1 标签 + 空编辑器 + 状态栏标签；文件菜单含「新建文件」。

### ② Markdown 预览顺手化
- 行内 Live Preview 本就默认开。用户的「每次点预览」之痛在**分屏渲染预览**（图/表所在）。
- 改：`previewOpen` 默认开 + localStorage 持久化；预览只对 `.md` 渲染 → 打开 md 即见渲染文档，代码文件不受扰，可一键关且偏好保留。
- 自动预览时若 CM 未挂载，回退用标签 `initialContent` 填预览，避免闪空。

### ③ Mermaid 图渲染（详见 [ADR-0002 Addendum](../../adr/0002-markdown-live-preview.md)）
- 多智能体研究工作流先行（mermaid 版本/API/Vite 懒载/安全），再实现。
- `render.ts`：```mermaid 围栏 → 惰性占位符（源码转义文本承载），`renderMarkdown` 保持同步。
- `mermaid.ts`（唯一 `import("mermaid")`）：按需动态加载（不进首屏，自成 async chunk）+ `strict` + 顶层 `htmlLabels:false` +
  输出 SVG 二次 DOMPurify（防御纵深）+ 主题跟随 + 哈希 SVG 缓存 + 失败响亮内联报错。
- **adversarial 验证抓到研究方案的 bug**：研究给的 `flowchart.htmlLabels:false` **不生效**（标签仍走 foreignObject → 被消毒剥空，节点文字全空）；
  实测改 **顶层 `htmlLabels:false`** 才对。Playwright 经预览 harness 验：flowchart 节点（开始/判断/执行操作/结束）+ 边标签（是/否）全渲染，普通代码块不受影响。
- `mermaid@^11.15.0`（≥11.10 含 CVE-2025-54881 修复）。首屏门禁加「entry chunk 不得含 mermaid」硬断言。

### 验证结果
- typecheck / lint(--max-warnings=0) / format ✅
- 前端 **114 测试**（render 新增 mermaid 占位符 2 例）；Rust **22 测试**
- build ✅;mermaid 落入独立 async chunk（mermaid.core 等），**首屏 gzip 143.2KB / 170KB 仍达标**（含新硬断言）
- Playwright：新建文件 / 文件菜单 / mermaid flowchart（含修复后标签）/ 预览 harness 逐一截图确认

### 遗留问题
- 自动预览 + mermaid 的真机端到端（打开真实 .md）需带显示器机器；headless 经 untitled + 预览 harness 已覆盖逻辑与渲染。
- mermaid 仅 flowchart 验过;其余图类型（sequence/gantt 等）mermaid 内部再懒载子块，应可用,未逐一验。

### 下一步
- 真机跑 v0.0.13 验观感;按用户反馈迭代。
