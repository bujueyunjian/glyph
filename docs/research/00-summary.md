# 立项调研综述

- 状态：✅ 完成（2026-06-02）
- 方法：多智能体并行调研（竞品/技术栈/AI/Markdown/设计 5 路）+ 对抗式事实核查（技术栈/AI 协议/版权 3 路），共 8 个 agent、约 51 万 token、188 次工具调用、全程联网取证。
- 详细分领域见 `01-landscape.md` ~ `05-design-ux.md`；全部一手来源见 [`sources.md`](sources.md)。

> ⚠️ **核查很重要**：对抗式核查推翻/修正了初版调研中的 7 处事实。本综述已采用**修正后**的结论，原始偏差记录在文末「核查修正清单」，写任何对外材料时以此为准。

---

## 1. 前提纠正（有据可查）

用户最初的前提"Notepad++、Sublime 都要付费"**只对了一半**：

- **Notepad++ = GPLv3，$0**。GPL 只约束"分发修改后的源码"，从不约束"使用"——公司内部用（哪怕改过）零费用、零披露义务。但它**只有 Windows**（Win32 + Scintilla，C++）。
- **Sublime Text = 真正付费的那个**。可免费试用，但"continued use 必须购买授权"；个人版 $99（永久授权，含 3 年更新，之后升级需再付费），**企业必须买 Business 订阅**：$65/$60/$55/$50 每席/年（1–10 / 11–25 / 26–50 / 51+ 人档），且**个人 license 不能覆盖组织席位**。
- **VS Code**：源码仓库是 MIT，但微软的**可下载二进制是专有 EULA**（禁逆向/再分发 + 含遥测），且**应用市场条款限定只能在微软自家产品里用**，C# Dev Kit / Live Share / Pylance / Remote-SSH 等关键扩展是微软构建独占。**VSCodium**（MIT 重构建）是干净的逃生口，但默认走 Open VSX、扩展更少更旧，且同样背着 Electron 的体积。

## 2. 市场空白（立项依据）

三大阵营各缺一角，**正中间是空的**：

- **重型 Electron**（VS Code/VSCodium/Pulsar）：美 + 生态大，但装 150–300MB+、内存 GB 级。
- **原生/终端快**（Zed/Lapce/Helix/Neovim/Kate/Geany）：快/轻，但要么强制模态、要么纯终端、要么配置繁重、要么 Linux 中心、要么不成熟。
- **极小可魔改**（Lite XL/Micro/Notepad++）：footprint 极小，但视觉陈旧或平台受限。

**没有产品同时是**：宽松 OSS + 公司零成本 + 原生轻量（<50MB / <200MB RAM / <300ms 启动）+ 开箱即美 + 非模态友好 + 开箱即用 LSP/Git + 跨平台。
**Zed 最接近**但 GPL/AGPL + Rust 重 + 偏 AI 云 + Mac 出身；**Lapce 精神最契合**但 buggy/不成熟/生态薄。

> 关键洞察：Lite XL 证明了**拒绝 Electron 就能把现代编辑器做到 ~3MB 包 / ~10MB 内存**——"激进的轻"是可达成的，不是空想。

## 3. 三个核心选型结论（已核查）

### 技术栈 → Tauri 2 + CodeMirror 6 + tree-sitter + LSP
- 每一层都在生产里验证：Tauri 2（Spacedrive/Hoppscotch/AppFlowy；**本团队已在跑 cc-switch、git-ai-studio**）、CodeMirror 6（Replit/Sourcegraph/Firefox DevTools）、tree-sitter+LSP（Zed/Helix/Neovim）。
- footprint 目标：**<15MB 安装 / <40MB 空闲内存 / <500ms 冷启动**——约 VS Code 的 1/10，因为复用系统 WebView（无捆绑 Chromium）+ CodeMirror ~50–300KB 核心（无 5–10MB Monaco）。
- **诚实的代价**：Web 栈做不到 Zed 的 ~2ms 键入延迟极限；但正常编辑落在"感觉即时"区间（<16ms/帧）。**缓解**：第一天就建键入延迟原型当 CI 守门指标；原生 GPU（GPUI）路线写成**长期逃生通道**，不作 v1 选项。
- **头号风险**：Linux WebKitGTK 碎片化（旧发行版缺 webkit2gtk-4.1、渲染 bug）→ 需 CI 发行版矩阵 + 多格式打包。详见 [`02-tech-stack.md`](02-tech-stack.md) 与 [`../adr/0001-tauri-codemirror-stack.md`](../adr/0001-tauri-codemirror-stack.md)。

### AI → "最快、任何 agent 都能插进来的编辑器"
- 最强结论：**in-editor AI（补全/改写/agent）已完全商品化**，硬刚 Cursor/Windsurf 是烧钱必输的偏题。
- 真正护城河在**做 agent 宿主**，押注两个已收敛的开放标准：
  - **MCP**（Model Context Protocol）：已捐给 Linux 基金会 Agentic AI Foundation（2025-12），1 万+ 公共 server，行业标准。**做客户端**。
  - **ACP**（Agent Client Protocol，"agent 界的 LSP"）：Zed+JetBrains 主导，JSON-RPC over stdio，已有 Claude Code/Codex CLI/Copilot CLI 接入注册表。**做宿主（client 侧）**。
- 战略价值：Zed 已证明"编辑器与外部 agent 的交互纯 UI 层，billing/法务在用户与 agent 厂商之间"——**我们托管 Claude Code/Codex 零模型开销、零 ToS 暴露**。
- v1 范围：薄层 in-editor AI（BYO-key 行内补全/改写/聊天，本地模型友好）+ 一等公民 MCP 客户端 + ACP 宿主（**仅本地子进程 stdio**，远程 agent 留 v2）。详见 [`03-ai-agents.md`](03-ai-agents.md) 与 [`../adr/0004-ai-agent-host-mcp-acp.md`](../adr/0004-ai-agent-host-mcp-acp.md)。

### Markdown → 内建 + 写作级实时预览（旗舰差异化）
- 走 **Obsidian 式 Live Preview**（source-of-truth Markdown，光标行显源码、移开即渲染），而非 Typora 全 WYSIWYG。**关键事实：Obsidian 正是基于 CodeMirror 6 实现 Live Preview——与我们核心栈同源，路被验证过。**
- 实现成**第一方插件**，跑在与第三方一致的扩展 API 上（dogfooding），既掌控品质又证明插件系统强度。
- v1 深度：语法高亮 + 按需分屏预览 + Live Preview + GFM 核心扩展 + frontmatter；KaTeX 懒加载、Mermaid 留插件；HTML 必须消毒（XSS）。详见 [`04-markdown.md`](04-markdown.md) 与 [`../adr/0002-markdown-live-preview.md`](../adr/0002-markdown-live-preview.md)。

## 4. 设计与体验（量化目标）

"乔布斯级体验"被翻译成可落地的硬指标（完整见 [`05-design-ux.md`](05-design-ux.md) 与 [`../design/design-system.md`](../design/design-system.md)）：

- **延迟即产品**：键入到上屏 p99 < 16ms（冲刺 < 8ms）；冷启动 < 300ms、热启动 < 120ms。
- **帧预算**：120fps = 8.3ms/帧、60fps = 16.7ms/帧，渲染 < 4ms；永不阻塞 UI 线程。
- **大文件**：100MB / 100 万行 < 1s 可滚动可编辑，高亮渐进流入。
- **键盘优先**：命令面板是"万能动词面"，Goto-Anything 式查找（文件/符号/行/文本前缀语法）。
- **克制美学**：近单色 chrome + 单一强调色，代码是唯一高对比元素；动效只为定位（120–200ms，尊重 reduced-motion）。
- **无障碍是验收项**：WCAG 2.2 AA（正文 4.5:1、非文本/焦点环 3:1），全键盘可操作。
- **字体**：默认 JetBrains Mono（连字默认关），可换任意已装等宽字体。

## 5. 头号长期风险（须从架构层应对）

1. **生态护城河**：VS Code 的真正锁定是扩展+LSP+远程开发，不是内核；**插件生态薄会直接拖死产品（Lapce 的死法）**。→ 架构必须插件优先，见 [`../adr/0003-plugin-first-architecture.md`](../adr/0003-plugin-first-architecture.md)。
2. **延迟天花板**：Web 栈 < 8ms 很难，需延迟原型守门，GPUI 作逃生口。
3. **强劲对手**：Zed 有 VC、周更、已 OSS/快/日益跨平台，可能在新人起量前补齐短板。差异化必须锋利（宽松许可证 + 激进的轻 + Notepad++ 式简单 + agent 宿主中立性），不能只是"又一个快编辑器"。

---

## 核查修正清单（对外材料须采用修正值）

| # | 初版说法 | 修正 |
|---|---|---|
| 1 | `@codemirror/lsp-client` v6.1.0 | 实为 **v6.2.2**（2026-05 中旬）；首方维护、仓库迁至 code.haverbeke.berlin（迁移≠弃坑）。但仍是年轻包（6.x），实战常需自行封装让 LSP 跑在 web worker。 |
| 2 | "floem 无全职维护" | **过度陈述**。floem 由 Lapce 团队在维护（2026-02 仍有发布）。正确论点是：Rust 原生 GUI（GPUI/floem/egui/iced/Slint）**生态分散、无主导者**，故"对团队不够主流"，而非"无人维护"。 |
| 3 | "VS Code 常驻 ~3.5GB" | 那是**重负载最坏情况**（23 进程 + 大工程 + 大量扩展）。干净实例约 300–800MB。footprint 论点无需靠这个数字，保持诚实以免审查时翻车。 |
| 4 | Sourcegraph Cody 桌面端跑在 Tauri 2 | **未能证实**，剔除。其余 4 个 Tauri 应用（Hoppscotch/Spacedrive/AppFlowy/Padloc）扎实。 |
| 5 | Electron "~4.0M 周下载" | **未证实**，引用前需取 npm 实时数据或弱化措辞。 |
| 6 | Claude Code SDK→Agent SDK 重命名于 2026-03 | **错**，实为 **2025-09-29**。 |
| 7 | Codex CLI "~3M WAU" | **过时**，2026-04 已 **4M+ WAU**。 |
| 附 | Windsurf "JetBrains 调研 ~8% 占有率" | **未证实**，疑似杜撰；公开数据仅 Copilot 29%、Cursor 18%、Claude Code 18%、Antigravity 6%。引用前重新取证。 |

> 另：Zed 的 GPL/AGPL 对**公司内部使用**完全无碍（copyleft 只在"分发修改后的二进制/对外提供修改后的协作服务"时触发）。把 GPL 列为商用顾虑是**夸大**——但我们仍选宽松许可证以消除采购处的审查摩擦（心理/流程成本，而非法律成本）。
