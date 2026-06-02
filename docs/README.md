# Glyph 文档中心

> Glyph 是一个开源、跨平台、极致轻量的现代代码编辑器。
> 目标：填补「宽松许可证 OSS + 公司零成本 + 原生轻量 + 开箱即美 + 非模态友好 + 任何 agent 都能插进来」的市场空白。

本目录是项目的**单一事实来源（single source of truth）**。所有方向、决策、进度都沉淀在这里，方便人类与 AI agent（Claude Code / Codex 等）随时接力。

## 阅读顺序（新成员/审查者从这里开始）

1. [`product/vision.md`](product/vision.md) —— 产品愿景、定位、差异化三角、非目标。**任何砍/留决策的最终依据。**
2. [`research/00-summary.md`](research/00-summary.md) —— 立项调研综述（含前提纠正、市场空白、核查修正）。
3. [`design/design-system.md`](design/design-system.md) —— 设计体系：10 条设计准则 + 性能 SLO + 视觉方向。
4. [`architecture/overview.md`](architecture/overview.md) —— 技术架构蓝图。
5. [`roadmap/roadmap.md`](roadmap/roadmap.md) —— 迭代路线图与里程碑。
6. [`progress/PROGRESS.md`](progress/PROGRESS.md) —— **当前进度与方向**（每次开工先看这里）。

## 目录结构

```
docs/
├── README.md                      本文件：文档导航
├── product/
│   ├── vision.md                  愿景 / 定位 / 差异化三角 / 非目标
│   └── PR-FAQ.md                  对外 PR-FAQ 与风险（媒体/用户视角）
├── research/                      立项调研（2026-06，多智能体调研 + 对抗式核查）
│   ├── 00-summary.md              调研综述（含核查修正清单）
│   ├── 01-landscape.md            竞品与版权全景
│   ├── 02-tech-stack.md           技术栈选型
│   ├── 03-ai-agents.md            AI 能力与 agent 宿主
│   ├── 04-markdown.md             Markdown 与所见即所得
│   ├── 05-design-ux.md            设计与用户体验
│   └── sources.md                 全部一手来源
├── design/
│   └── design-system.md           设计体系（准则 + SLO + 视觉规范）
├── standards/
│   └── naming.md                  命名规范（取自 specflow，TS + Rust，强制）
├── architecture/
│   ├── overview.md                架构总览（进程模型/模块边界/数据流）
│   ├── plugin-architecture.md     插件优先架构
│   └── ai-agent-architecture.md   MCP 客户端 + ACP 宿主
├── adr/                           架构决策记录（Michael Nygard 风格）
│   ├── 0001-tauri-codemirror-stack.md
│   ├── 0002-markdown-live-preview.md
│   ├── 0003-plugin-first-architecture.md
│   └── 0004-ai-agent-host-mcp-acp.md
├── roadmap/
│   └── roadmap.md                 路线图 / 里程碑 / 版本切片
├── progress/
│   ├── PROGRESS.md                进度主表（方向 + 状态 + 下一步）
│   └── tasks/                     每个任务的「开工前/收工后」文档
│       ├── TEMPLATE.md
│       └── NNNN-<slug>.md
└── workflow/
    └── doc-driven-workflow.md     文档驱动工作流（人/AI 协作规范）
```

## 文档驱动工作流（强制）

本项目采用**文档驱动**：每个开发任务**开工前写计划文档、收工后写变更文档**，统一放在 [`progress/tasks/`](progress/tasks/)。
目的：让任意时刻的 Codex / Claude / 人类都能凭文档理解"做到哪了、为什么这么做、接下来做什么"，无缝接力。
规范详见 [`workflow/doc-driven-workflow.md`](workflow/doc-driven-workflow.md)。

## 状态图例

文档中统一使用：✅ 已完成 · 🚧 进行中 · 📝 仅大纲 · ⏳ 计划中 · ❌ 已废弃/不做
