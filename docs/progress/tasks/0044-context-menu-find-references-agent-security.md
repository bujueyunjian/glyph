# 任务 0044：右键上下文菜单 + 查找引用 + 命令归位 + Agent 数据安全

- 状态：✅ 完成
- 里程碑：M2/M4 · 关联任务：#19-#22（TaskList）· 负责人：Claude
- 开工：2026-06-04 · 收工：2026-06-04

> 规范见 [`../../workflow/doc-driven-workflow.md`](../../workflow/doc-driven-workflow.md)。

---

## Plan（开工前）

### 背景 / 目标
用户反馈两点 +一条安全指令:① 发版太勤,改为「一批提交统一构建」;② 右下角状态栏塞命令按钮「不对」,
很多操作应走**右键**;③ 试用 AI 面板时遇 `claude-agent-acp: No such file or directory`,且强调
**极度重视数据安全,不能因 agent 导致信息泄漏**。据此补齐编辑器右键菜单(table-stakes 缺口)、把命令
归位到约定俗成的右键/菜单栏、状态栏回归纯状态,并顺手把已验证的 LSP 后端再接一项**查找引用**;同时
对 agent 链路做数据安全加固。

### 范围 / 非范围
- 范围:查找引用(references)映射 + 搜索面板覆盖模式;编辑器右键上下文菜单;状态栏瘦身 + 命令归位菜单栏;
  agent 未找到的可执行报错;agent 首用知情同意 + 能力边界回归测试 + ADR-0009。
- 非范围:签名/公证;agent 的 cwd 钉到工作区(留 ADR-0009 后续);细粒度权限弹窗(v2)。

### 涉及文件
- `src/features/lsp/protocol.ts(+test)` —— `referencesToHits()` 纯映射 + 单测
- `src/components/command/SearchPanel.tsx` —— `overrideHits/overrideTitle` 覆盖模式(复用命中列表展示引用)
- `src/components/editor/EditorContextMenu.tsx` —— 新建 radix context-menu 右键菜单
- `src/App.tsx` —— `doFindReferences`/剪贴板/`openSearch`/`ensureAgentConsent`;包裹两个编辑面板;命令与快捷键
- `src/components/workbench/StatusBar.tsx` —— 移除命令按钮,只留文件/语言/LSP/版本
- `src/components/workbench/MenuBar.tsx` —— 视图:命令面板+切换分屏;编辑:跨文件搜索
- `src-tauri/src/agent.rs` —— `spawn_agent()`(ENOENT 可执行指引)+ `deny_reply()` 安全边界 + 2 个回归测试
- `docs/adr/0009-agent-data-security.md` —— agent 信任模型 ADR
- i18n zh-CN/en —— 引用/剪贴板/同意文案 + agent 安装提示

### 验证计划
- [x] typecheck / lint / format
- [x] rs:fmt / clippy
- [x] 单测(前端 102 / Rust 20)
- [x] build + 首屏体积门禁
- [x] Playwright 视觉验证(右键菜单 / 状态栏 / 菜单栏)

---

## Outcome（收工后）

### 实际改动
1. **查找引用**:`referencesToHits(result, rootPath)` 把 LSP `Location[]` 映射为搜索命中(行列转 1 基、
   相对路径、无行文本);`doFindReferences` 请求 `textDocument/references`(`includeDeclaration: true`),
   失败响亮 toast、空结果提示;结果喂入 `SearchPanel` **覆盖模式**(`overrideHits` 非 null 时隐藏搜索框、
   直接列出引用,点击跳转)。命令面板 + Shift+F12 + 右键三处可达。
2. **右键上下文菜单**:`EditorContextMenu`(radix context-menu,与菜单栏同款样式)——剪切/复制/粘贴 →
   查找/替换 → (LSP 就绪才出现)转到定义/查找引用/重命名/格式化 → 命令面板。包住主面板与分屏面板;
   右键经 `onMouseDownCapture` 自动切聚焦面板,复用既有 `focusedPane` 回调,动作落到正确面板。
   剪贴板经 `navigator.clipboard` + CM dispatch(粘贴/剪切走撤销栈),失败 toast。
3. **状态栏瘦身 + 命令归位**:StatusBar 删掉 搜索/分屏/命令 三个按钮,只剩文件/语言/LSP/版本(纯状态);
   命令面板 + 切换分屏 进**视图**菜单,跨文件搜索 进**编辑**菜单——可发现性不降,且符合右键/菜单栏约定。
4. **Agent 报错**:`spawn_agent()` 统一两处 spawn;`ErrorKind::NotFound` 给可执行指引(Glyph 不内置 agent,
   `npm i -g @zed-industries/claude-code-acp` 提供 `claude-code-acp` 命令)而非裸 OS 错误码。
   (⚠️ 当时据 GitHub HEAD 的 package.json 误判 bin 为 `claude-agent-acp` 并设为默认;后经真机 + npm registry 核实,
   **发布版 0.14–0.16 的 bin 实为 `claude-code-acp`**,默认在任务 0050 已改正。教训:核 bin 名要查 npm registry 已发布版本,别信 GitHub HEAD。)
5. **Agent 数据安全**(ADR-0009):
   - **能力否决是安全边界**:`client_init_params` 的 `fs/terminal` 恒 false;agent→client 请求由
     `deny_reply()` 一律回错误。新增 2 个 Rust 回归测试守卫(翻 true 或静默放行即失败)。
   - **首用知情同意**:`ensureAgentConsent()` 首次运行 agent 前弹确认(数据发给你配置的 agent 及模型方、
     Glyph 仅本地转发不存不传),同意持久化 localStorage,未同意不发起。
   - 审计确认:agent 数据仅走本地 stdio,Glyph 侧无网络外发、不日志、不落盘。

### 验证结果
- typecheck ✅ / lint(--max-warnings=0)✅ / format:check ✅
- 前端单测 **102 passed**(新增 referencesToHits 2 例);Rust **20 passed**(新增安全边界 2 例)+ 2 ignored(rust-analyzer e2e)
- rs:fmt ✅ / clippy ✅(零告警)
- build ✅;首屏 JS gzip **140.8KB / 170KB** 预算内(radix-context-menu 约 +4KB)
- Playwright(pnpm dev + 浏览器):右键菜单按预期渲染(无 LSP 时正确隐藏 LSP 组)、状态栏已无命令按钮、
  视图/编辑菜单归位项就位 —— 截图逐一确认

### 遗留问题
- 右键菜单的 LSP 组、查找引用面板、agent 同意弹窗(Tauri `ask`)需真机(Tauri + 已装 LSP/ACP)验,
  headless 浏览器无法触达;映射与边界已被单测覆盖。
- agent 同意不可在 UI 内撤销(需清 localStorage);cwd 仍是进程目录而非工作区根 —— 均列 ADR-0009 后续。

### 下一步
- agent cwd 钉到打开的工作区根(安全收敛作用域)+ 设置面板可见可撤销的同意开关。
- 候选:signature help / 文档大纲 / MCP 客户端(均可 headless 验证后端)。
