# Glyph 路线图

- 状态：✅ 立项基线（2026-06-02）
- 与 [`../progress/PROGRESS.md`](../progress/PROGRESS.md) 配合：roadmap 给方向，PROGRESS 给当前状态。

---

## 里程碑总览

| 里程碑 | 主题 | 状态 | 出口标准 |
|---|---|---|---|
| **M0 立项地基** | 方向 + 文档 + 骨架 + 首功能 | ✅ 完成 | 文档齐备；骨架可起；能打开/编辑/保存 + 语法高亮 |
| **M1 核心编辑体验** | "轻快美"达标 | 🟢 大部分完成 | 多标签 ✅ / 命令面板 ✅ / Goto Anything ✅ / 查找替换 ✅ / 主题 ✅ / 文件树 ✅ / 设置 ✅ / 工作区 UX ✅；**待**：分屏、键入延迟 CI 门禁 |
| **M2 智能与语言** | tree-sitter + LSP | ◐ 部分 | 多语言高亮 ✅(50+,Lezer) / 文件树 ✅；**待**：LSP 补全/诊断/跳转、tree-sitter 替换、大文件模式、跨文件搜索 |
| **M3 写作级 Markdown** | Live Preview 旗舰 | ⏳ 未开始（差异化支柱②） | Obsidian 式 Live Preview + GFM + frontmatter + 按需分屏 |
| **M4 Agent 宿主** | MCP + ACP | ⏳ 未开始（差异化支柱③） | MCP 客户端；ACP 本地子进程托管 Claude Code/Codex；薄层 in-editor AI（BYO-key） |
| **M5 生态化** | 插件优先开放 | ⏳ 未开始 | 稳定公共插件 API + capability 沙箱 + Open VSX 注册表 |
| **M6 发布与分发** | 三平台 GA | ⏳ 未开始 | 签名/公证 + 自更新 + CI 发行版矩阵 + 文档站 |

> 里程碑顺序是方向而非死锁；M1–M4 的部分工作可交错（如性能守门贯穿始终）。
> **当前位置（2026-06-02）**：M0 ✅ + M1 主体 ✅。「轻·快·美」地基已成；下一阶段重点是**收尾 M2（文件操作/LSP）**或**启动差异化支柱 M3（Markdown Live Preview）/ M4（Agent 宿主）**。详见 [`../progress/PROGRESS.md`](../progress/PROGRESS.md)。

## M0 立项地基（当前）

切片：
1. ✅ 多智能体深度调研 + 对抗式核查
2. 🚧 地基文档（背景/愿景/设计/架构/路线图/进度追踪/工作流）
3. ⏳ 项目元文件（CLAUDE.md / README / CONTRIBUTING）
4. ⏳ Tauri 2 + React 19 + Vite 可运行骨架（对齐 git-ai-studio）
5. ⏳ 第一个功能：文件读写 + 语法高亮
6. ⏳ 验证：install + typecheck + clippy + 构建自检

## M1 核心编辑体验（下一步重点）
- 性能原型与 CI 门禁（键入延迟 + 帧时）——**第一天就做，贯穿始终**。
- 多标签、分屏、状态栏、活动栏。
- 命令面板（cmdk）+ Goto Anything（文件/符号/行/文本前缀语法）。
- 查找/替换（增量计数 + 实时高亮 + regex + 替换预览）。
- token 化主题（亮/暗，过 AA）+ 会话恢复。

## M2 智能与语言
- tree-sitter grammar 按需 WASM 加载，多语言高亮。
- LSP sidecar 编排 + `@codemirror/lsp-client` 桥接（补全/hover/诊断/跳转/重命名）。
- 大文件模式；项目文件树；ripgrep 式全局搜索（Rust）。

## M3 写作级 Markdown
- Obsidian 式 Live Preview（第一方插件形态）；GFM 核心扩展；frontmatter；按需分屏；KaTeX 懒加载。

## M4 Agent 宿主
- MCP 客户端；ACP 本地宿主（权限提示/fs/终端/流式 diff）；薄层 in-editor AI（BYO-key + 多 provider + 本地模型）。

## M5 生态化
- 稳定公共插件 API；capability 沙箱（WASI / JS worker 选型）；Open VSX 注册表。

## M6 发布与分发
- tauri-action 签名/公证；自更新（updater + process）；CI 发行版矩阵；README/文档站；许可证（MIT/Apache-2.0 终定）。

## 贯穿始终（非里程碑，持续）
- 性能 SLO 守门（CI）。
- 无障碍（WCAG 2.2 AA）验收。
- 双语 UI（zh-CN + en）。
- 每个任务的 before/after 文档（文档驱动工作流）。
