# Glyph 路线图

- 状态：🔄 更新（2026-06-03，经 pantheon 多版本规划 + AI 方向决策）
- 与 [`../progress/PROGRESS.md`](../progress/PROGRESS.md) 配合：roadmap 给方向，PROGRESS 给当前状态。

---

## 里程碑总览

| 里程碑 | 主题 | 状态 | 出口标准 |
|---|---|---|---|
| **M0 立项地基** | 方向 + 文档 + 骨架 + 首功能 | ✅ 完成 | 文档齐备；骨架可起；能打开/编辑/保存 + 语法高亮 |
| **M1 核心编辑体验** | "轻快美"达标 | ✅ 主体完成 | 多标签/命令面板/Goto Anything/查找替换/主题/文件树/设置 ✅；体验加固 ✅；测试+CI+体积门禁 ✅；**待**：键入延迟实测尺子（需显示环境） |
| **M2 可日用：编辑力 + 智能与搜索** | 让它能天天用 | 🚧 进行中 | 文本力量（行变换/多光标，命令面板动词）+ 跨文件搜索(ripgrep) + 文件树增删改+监听 + 分屏 + LSP（补全/诊断/跳转）+ 大文件模式 |
| **M3 写作级 Markdown Live Preview** | 差异化支柱② + AI 内容画布 | 🚧 核心已起 | Obsidian 式 Live Preview + GFM + frontmatter + mermaid + 按需分屏（渲染+消毒核心 ✅，见 [0017](../progress/tasks/0017-markdown-live-preview.md)） |
| **M4 Agent 宿主（AI 时代决胜版本）** | 差异化支柱③ | 🚧 地基已起 | ACP 本地宿主（Claude Code/Codex 在内运行 + diff 审查 + 权限提示 + 终端/流式）+ MCP 客户端 + 薄层 BYO-key in-editor AI + text→图表；`proc.rs` 子进程地基 ✅（见 [0018](../progress/tasks/0018-agent-host-proc-spike.md)） |
| **M5 生态化** | 插件优先开放 | ⏳ | 稳定公共扩展 API（dogfood ②③，见 [ADR-0006](../adr/0006-internal-extension-points.md)）+ capability 沙箱 + Open VSX 注册表 |
| **M6 发布与分发** | 三平台 GA | 🚧 已起步 | 签名/公证 + 自更新（updater）+ 发行版矩阵；跨平台 release CI + v0.0.1 四平台包 ✅（见 [0019](../progress/tasks/0019-release-ci.md)） |

> 里程碑顺序是方向而非死锁；性能守门贯穿始终。
> **当前位置（2026-06-03）**：M0 ✅ + M1 主体 ✅；本程加固/测试CI/MD核心/Agent地基/跨平台发布（v0.0.1 已出 mac/win/linux 包）。下一程主线 **M2「可日用」**（含文本力量），再点亮 **M3 Markdown 画布**，**M4 Agent 宿主是 AI 时代决胜版本**。

## AI 方向（2026-06-03 决策 · 见 [ADR-0004](../adr/0004-ai-agent-host-mcp-acp.md) + [ADR-0007](../adr/0007-ai-as-edit-command.md)）

经 pantheon 客观分析：**AI 时代不做"又一个有 AI 的编辑器"，做"任何 AI agent 的最佳中立驾驶舱"。**
- **护城河 = ③ Agent 宿主**（M4 决胜版）：Claude Code/Codex 经 ACP 在编辑器内运行，BYO-key、零模型开销、零 ToS 暴露；Glyph 提供"最快最美的外壳 + 上下文 + 安全（diff 审查/权限）"，外部 agent 负责思考。
- **薄层 in-editor AI**：BYO-key 行内动作（润色/聊天，路由到用户 key/agent）；AI 形态统一为「返回编辑/产物的命令」走现有管线（ADR-0007），不阻塞打字热路径。
- **text→图表**（NL→mermaid）：唯一真魅力的自建薄功能，渲染进 ②；依赖 M3 mermaid 先成。
- **明确不做**：自建模型 / 自有 AI 大脑 / 自主多文件 agent（硬刚 Cursor 是烧钱必输偏题）；AI 排版/格式化（用确定性 formatter）；重度自建润色/NL 引擎（交给宿主 agent）。

## M2 可日用：编辑力 + 智能与搜索（下一程主线）
- **文本力量**：行变换家族（行尾去空格、排序、去重、大小写、前缀/后缀/前后缀）做成**命令面板动词 + 多光标 primitive**（非菜单墙）；首刀见 [0020](../progress/tasks/0020-text-power-line-ops.md)。
- 跨文件搜索：ripgrep 式 Rust 后端 + 流式结果（复用 proc.rs 推送通道）。
- 文件树增删改 + `notify` 监听刷新 + `.gitignore` 过滤。
- 分屏；标签拖拽。
- LSP sidecar 编排 + `@codemirror/lsp-client` 桥接（补全/hover/诊断/跳转/重命名）；大文件模式。（LSP 体量大，可拆 M2.5。）
- 键入延迟尺子（M1 遗留，需显示环境）。

## M3 写作级 Markdown Live Preview（差异化支柱② + AI 画布）
- Obsidian 式 Live Preview（光标行显源码、移开渲染）；GFM + frontmatter；**mermaid**；按需分屏；KaTeX 懒加载。
- 渲染+消毒核心已成（marked + DOMPurify，见 0017）；经 ADR-0006 内部扩展缝接入。
- 成为 M4 text→图表 的渲染画布。

## M4 Agent 宿主（差异化支柱③ · AI 时代决胜版本）
- ACP 本地宿主：spawn Claude Code/Codex/Copilot CLI（proc.rs 地基 ✅，0018）+ **diff 审查 UI + 权限提示**（fs/terminal 显式授权）+ 终端/流式。
- MCP 客户端。
- 薄层 in-editor AI（BYO-key + 多 provider + 本地模型友好；DeepSeek 等经 OpenAI 兼容端点 / MCP）。
- text→图表（NL→mermaid，渲染进 ②）。
- 形态遵 [ADR-0007](../adr/0007-ai-as-edit-command.md)：AI = 返回编辑/产物的命令。

## M5 生态化
- 稳定公共插件 API（dogfood ②③，ADR-0006 扩展缝长成）；capability 沙箱（WASI / JS worker 选型）；Open VSX 注册表。

## M6 发布与分发
- 跨平台 release CI + v0.0.1 四平台包已起步（0019）。
- 签名/公证（Apple 证书 / Windows 签名）；自更新（updater + latest.json，需 minisign 密钥）；发行版矩阵；README/文档站；许可证（MIT/Apache-2.0 终定）。

## 贯穿始终（非里程碑，持续）
- 性能 SLO 守门（CI：首屏体积门禁 ✅ 已起，键入延迟尺子待显示）。
- 无障碍（WCAG 2.2 AA）验收。
- 双语 UI（zh-CN + en）。
- 每个任务的 before/after 文档（文档驱动工作流）。
