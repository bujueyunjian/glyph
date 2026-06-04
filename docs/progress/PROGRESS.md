# Glyph 进度与方向

> **每次开工先读这里。** 这是项目的当前状态与方向的权威快照。
> 方向细节见 [`../roadmap/roadmap.md`](../roadmap/roadmap.md)；每个任务的前/后文档见 [`tasks/`](tasks/)。

- 最后更新：2026-06-04（M0–M4 主体 ✅ + **LSP 核心 ✅(补全/诊断/悬停/转到定义/格式化/重命名/符号/**查找引用**,对真实 rust-analyzer e2e)** + **编辑器右键上下文菜单**(命令归位:状态栏回归纯状态、命令进右键/菜单栏)+ **Agent 数据安全**(首用知情同意 + 能力否决边界 + 回归测试,[ADR-0009](../adr/0009-agent-data-security.md))+ agent 未装的可执行报错;**已发 v0.0.11**;pantheon 路线图 A/B(UI)/C/D 完成,E 待证书)
- ⚙️ **发版节奏(用户定)**:不逐功能发版,功能累积到 main 批量提交、统一构建,里程碑或用户指示才打 tag 出包。
- 当前里程碑：**可日用成形 + 三角支柱全部见形**。①轻快美:首屏 <140KB/体积门禁/键入延迟门禁;②写作级 MD:渲染/预览/格式化 + 行内 Live Preview(光标感知隐藏标记,Playwright 验);③Agent 宿主:一次性+流式 + AI 侧栏(接 ACP 适配器)。LSP table-stakes 核心齐。剩余硬卡:E 签名(证书)+ agent/LSP 的真机运行验证。
- 一句话定位：公司能免费铺给 500 名开发者、无需授权、无需法务审查的跨平台代码编辑器——又快、又轻、又美，任何 AI agent 都能插进来。

---

## 已锁定的方向（改动需走 ADR）

| 维度 | 决定 | ADR |
|---|---|---|
| 技术栈 | Tauri 2 + CodeMirror 6 + tree-sitter + LSP；前端 React 19+TS+Vite（对齐 git-ai-studio） | [0001](../adr/0001-tauri-codemirror-stack.md) |
| Markdown | Obsidian 式 Live Preview（非 Typora 全 WYSIWYG），做成第一方插件 | [0002](../adr/0002-markdown-live-preview.md) |
| 扩展性 | 插件优先 + dogfooding；公共 API/市场留 v2+ | [0003](../adr/0003-plugin-first-architecture.md) |
| AI | agent 宿主：MCP 客户端 + ACP 本地宿主；不自建模型/不绑 key | [0004](../adr/0004-ai-agent-host-mcp-acp.md) |
| 许可证 | 倾向 MIT/Apache-2.0（M6 前终定） | —— |
| 名称 | `Glyph`（工作名，待商标/域名核查） | —— |

## 任务看板（M0）

| # | 任务 | 状态 | 文档 |
|---|---|---|---|
| 0 | 多智能体调研 + 对抗式核查 | ✅ | [research/](../research/) |
| 1 | 立项地基文档 | ✅ | [0001](tasks/0001-foundation-docs.md) |
| 2 | 项目元文件（CLAUDE.md/README/CONTRIBUTING） | ✅ | [0002](tasks/0002-project-meta.md) |
| 3 | Tauri 2 + React 19 + Vite 可运行骨架 | ✅ | [0003](tasks/0003-scaffold.md) |
| 4 | 第一个功能：文件读写 + 语法高亮 | ✅ 编译层（GUI 待自验） | [0004](tasks/0004-file-edit-highlight.md) |
| 5 | 验证：骨架全门禁通过（install/build/lint/clippy/fmt） | ✅ | [0003](tasks/0003-scaffold.md) |

> 骨架验证结论（2026-06-02）：前端构建 JS 280.95 kB / gzip 88 kB；cargo check/clippy 无警告（Tauri 2.11.2）。GUI 自检需本地 `pnpm tauri:dev`。命名已按 specflow 规范（见 [standards/naming.md](../standards/naming.md)）。

## 环境与工具链（本机已确认 2026-06-02）
- Node v24.12.0 / pnpm 10.33.0 / Rust 1.95.0 / cargo 1.95.0 / git 2.54
- Tauri CLI 走项目 devDependency（`@tauri-apps/cli`），用 pnpm 调用
- 参照项目：`../../../git-ai-studio`（同款 Tauri 2 + React 19 + CM6 栈与约定）

## 已完成（M0→M1，截至 2026-06-02）
调研 → … → 文件树 → 多标签 → Goto Anything → 查找/替换 → 工作区 UX(侧栏/最近/菜单) → **设置面板(Ctrl/Cmd+, · 字号/Tab/缩进/换行/行号/连字/主题,持久化)**。release 二进制 6.3MB。

## 下一步（2026-06-03 经审查 + pantheon 决策 + 红队核查定案，按此顺序）

> **决策依据**：完整审查发现护城河支柱② ③ 零代码、①「快」从未实测（用户已反馈「觉得重」）、零测试零 CI、ADR-0003 插件优先在代码层从未发生。结论修正自「②优先」——红队一致指出性能门禁必须前置、不能搭车。详见任务 0015–0018 与 [ADR-0006](../adr/0006-internal-extension-points.md)。
>
> **本轮进展（2026-06-03，分支 `feat/m1-hardening-and-ci`）**：0015 ✅ 代码完成（过 `pnpm check` + 真跑 `tauri:dev` 启动成功，Playwright 验焦点环/空态）· 0016 ✅ 测试/CI/首屏体积门禁（键入延迟实测待显示环境）· 0017 🚧 渲染+消毒核心完成（含 XSS 单测）· 0018 🚧 子进程+stdio+Rust→UI 推送最小闭环（`cargo test` 验 spawn 闭环）。**仍需显示环境**：0015 原生交互手验、0016 键入延迟尺子、0017 CM 装饰接入后的延迟验证、0018 emit→UI 端到端。

**本程（0015–0019）已交付**（加固 / 测试CI / 体积门禁 / MD 核心 / proc.rs 地基 / v0.0.1 四平台发布）。下一程主线 = **M2「可日用」**（见 [roadmap](../roadmap/roadmap.md) + AI 方向 [ADR-0007](../adr/0007-ai-as-edit-command.md)）：

**已完成并推送（2026-06-03/04 自主推进，编译/CI/测试层验证，GUI 行为待显示自验）**：
- ✅ [0020] 文本力量（行变换 + 多选区 + 前后缀，命令面板动词）
- ✅ [0021] 跨文件搜索（ripgrep 式 `ignore` 后端 + 搜索面板）
- ✅ [0022] 文件树增删改 + `notify` 监听（右键菜单）
- ✅ [0025] Markdown 预览分屏（M3，复用 0017 渲染，懒加载保首屏）
- ✅ [0024] M4 ACP agent 一次性 prompt 客户端（轻量自研无 tokio）+ ADR-0008
- ✅ [0026] 标签拖拽排序
- ✅ [0023] 编辑器分屏（双面板，聚焦路由 save/undo/find/变换；低风险方案主面板逻辑不动）
- ✅ [0027] M4 **流式** agent 对话（分块经 `agent://chunk` 事件回流 UI，后台线程）
- ✅ [0028] 全部保存 + `getContent` 防丢数据加固（聚焦优先+回退，消除分屏覆盖空内容隐患）
- ✅ [0029] Markdown 格式化命令族（粗体/斜体/标题/列表/引用，纯函数+5 单测，命令面板仅 MD 可见）
- ✅ [0030] 键入延迟 CI 门禁（文档模型层，大/小文档耗时比断言，抗 CI 噪声）
- ✅ [0031] 行内 Markdown 所见即美（编辑器内 mark 装饰 + GFM，viewport 限定，4 单测）
- ✅ [0032] LSP 传输层地基（Content-Length 帧编解码 + 服务器子进程 + 事件桥，5 cargo 单测）
- ✅ [0033] 最近文件夹（工作区历史，抽 `pushRecent` 纯函数共用，4 单测）
- ✅ [0034] 行编辑动词进命令面板（注释/移动/复制/删除行，复用 CM 内置命令）
- ✅ [0035] 启动重开上次工作区文件夹（会话连续性）
- ✅ [0036] 行内 Live Preview:光标感知隐藏语法标记(Obsidian 式;Playwright harness 验)
- ✅ [0040] 对抗式多智能体审查 → 修 21 真 bug(分屏数据丢失/agent 生命周期/LSP 加固等,5 批)
- ✅ [0038/0039/0042] **LSP 核心**:initialize 握手 + 请求关联 + completion 往返(对真实 rust-analyzer e2e)→ 补全 + 诊断 + 悬停 + 转到定义接入编辑器 + 状态栏指示器
- ✅ [0041] 新 logo(全平台图标)+ 文件关联(用 Glyph 打开)+ 状态栏(文件/语言 + 功能入口)
- ✅ MD 链接 Live Preview(只留文本)· 字体族设置 · 关闭其他/全部标签 · **AI Agent 侧栏**(命令配置+内联追问+流式)
- ✅ [0043] LSP 格式化 + 重命名(WorkspaceEdit)+ 文档符号(QuickOpen `@`)+ 更新检查
- ✅ [0044] **查找引用**(references→搜索面板覆盖模式)· **编辑器右键上下文菜单**(剪贴板/查找/LSP 组/命令面板)· **状态栏瘦身为纯状态 + 命令归位菜单栏**(视图:命令面板/分屏;编辑:跨文件搜索)· **Agent 数据安全**(首用知情同意 + `deny_reply` 能力否决边界 + 2 回归测试,[ADR-0009](../adr/0009-agent-data-security.md))· agent 未装的可执行报错
- ✅ [0045] **文档大纲面板**(`outlineSymbols` 带层级 depth + 单测;documentSymbol 拉取,缩进/kind/点击跳转;视图菜单 + `Ctrl/⌘⇧O`;Playwright 验面板壳/needsLsp 态)
- ✅ [0046] **Agent 作用域收敛**(ADR-0009 后续):agent cwd 钉到打开的工作区根(`resolve_cwd`,缺省回退进程目录)+ 回归测试,不再默认暴露打包 app 的启动目录(可能 `/`)
- ✅ 发布 v0.0.2 → **v0.0.11**(逐版 4 平台 CI 绿;后续改批量发版)

**剩余(硬卡外部资源/真机验证,headless 已做到极限)**：
- ⛔ **E:M6 签名/公证/自更新**:需 **Apple/Windows 证书 + minisign 密钥**(外部凭据)。
- ⛔ **B 真机验证**:agent 侧栏 + 流式管线已就绪;真实对话/diff/权限需本地装 **ACP agent + 鉴权 key**。
- ⛔ **LSP/Live Preview 真机观感**:协议/逻辑已 e2e+单测;补全弹窗/诊断波浪线/隐藏标记的像素级观感需**运行 app** 肉眼验。
- ⛔ **输入→上屏 端到端延迟实测**:文档模型门禁(0030)已守;绘制层需显示环境 + Playwright/tauri-driver。
- ⏳ MCP 客户端:需引 `rmcp`(footprint 风险)+ 真实 MCP server;留后续。

> **AI 方向**（pantheon 客观决策）：不做"又一个有 AI 的编辑器"，做"任何 agent 的最佳中立驾驶舱"。护城河 = **M4 Agent 宿主（AI 时代决胜版）**；in-editor AI 走「AI = 返回编辑/产物的命令」host-first + 薄 BYO-key（ADR-0007）；明确不硬刚 Cursor；text→图表依赖 M3 mermaid 先成。

**已知欠债**：输入→上屏端到端延迟实测（文档模型层门禁 0030 已守，绘制层需显示环境）；LSP 复用 proc.rs 推送通道（待接）；行内 Live Preview 视觉调校（需显示环境）；macOS/Windows 签名公证 + updater（M6，需证书/密钥）。

## 性能/"轻"感知（用户反馈：感觉比 Notepad++/Typora 重）—— 任务 #7 已修
> 结论：部分是 dev 调试构建的错觉，部分是真实问题。判断"轻不轻"要看 `pnpm tauri build` 的 release 包，不是 `tauri:dev`。
> **修复结果（2026-06-02，任务 [0006](tasks/0006-perf-lazy-fonts-keystroke.md)）：首屏 JS 1,104KB/gzip 377KB → 366KB/gzip 117KB（−69% gzip），>500KB 警告消除。**
1. ✅ **语言包懒加载**：改 `import()` 动态加载 → 7 个语言包成按需 chunk。
2. ✅ **字体**：改 `wght.css`。修正认知：fontsource 用 unicode-range 分面，运行时本就只下载 latin，"全字集拖累运行时"是误判，大头是语言包。
3. ✅ **按键架构**：CodeMirror 自己持有文档 + 仅标脏 + 保存时经 ref 取内容，去掉"每键整篇过 React state"。
4. ✅ **额外**：整个编辑器 React.lazy 懒加载——空态启动不加载 CodeMirror。
5. ✅ **release 二进制体积 = 6.3MB**（`cargo build --release` 重试成功，确认首次是 rustc 编 serde_derive 的偶发栈溢出崩溃；系统 WebView 不计入，对比 VS Code 300MB+ —— "轻"已坐实）。
6. ⏳ 键入延迟原型 + CI 帧时/延迟门禁（设计体系 B 节）；冷启动/键入延迟需本地 release 包实测。

> 语言覆盖（任务 [0007](tasks/0007-language-coverage.md)）：从 8 类扩到 ~50 个扩展名（官方 Lezer + legacy-modes），全部懒加载，初始体积不变。

## 待决问题（open questions）
- 🔴 **语言包懒加载**（见上性能清单 #1）。
- 黑屏根因：已提升对比度 + 加入编辑器内容；GUI 是否真渲染待用户确认（仍全黑则需 Console 报错）。
- 插件沙箱选型（WASI vs JS worker/QuickJS）。
- UI 字体（Geist vs Inter）。
- 许可证最终（MIT vs Apache-2.0）。
- 键入延迟原型何时插入（建议 M1 第一件事，但骨架期就预埋测量）。

## 重要提醒
- **性能 SLO（延迟/footprint）是承诺，需尽早进 CI 门禁。**
- **失败响亮**：不写降级/兼容兜底；验证失败如实记录。
- 每个任务**前写 Plan、后写 Outcome**（[工作流](../workflow/doc-driven-workflow.md)）。
