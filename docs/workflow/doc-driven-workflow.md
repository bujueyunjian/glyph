# 文档驱动工作流（人 / AI 协作规范）

- 状态：✅ 生效（2026-06-02）
- 适用：所有贡献者，**尤其是 AI agent（Claude Code / Codex 等）接力时**。

---

## 为什么

本项目刻意**慢而稳**：方向、决策、进度全部沉淀为文档，使任意时刻的人或 AI 都能凭文档回答三个问题——**做到哪了？为什么这么做？接下来做什么？**——从而无缝接力、持续迭代。

## 铁律：每个任务，开工前 + 收工后各写一份文档

每个开发任务在 [`../progress/tasks/`](../progress/tasks/) 下对应**一个文件** `NNNN-<slug>.md`（编号与 [`../progress/PROGRESS.md`](../progress/PROGRESS.md) 任务表一致）：

1. **开工前（Plan，可先写大纲）**：填"背景/目标、范围与非范围、方案大纲、涉及文件、验证计划、风险"。
2. **收工后（Outcome）**：补"实际改动、与计划的差异、验证结果（含失败如实记录）、遗留问题、下一步"。

模板见 [`../progress/tasks/TEMPLATE.md`](../progress/tasks/TEMPLATE.md)。

## 标准节奏

```
读 PROGRESS.md（看方向与状态）
  → 认领/创建任务，写 Plan 文档（开工前）
    → 实现（最小变更、先读后写、根因优先）
      → 验证（typecheck / lint / clippy / test / build）
        → 写 Outcome 文档（收工后，失败也如实写）
          → 更新 PROGRESS.md 与 roadmap 状态
            → Conventional Commit 提交（feat/fix/docs/...）
```

## 文档规范与格式

- 每份文档**顶部带状态行**：`状态：✅/🚧/📝/⏳/❌ + 日期`。
- 状态图例统一：✅ 已完成 · 🚧 进行中 · 📝 仅大纲 · ⏳ 计划中 · ❌ 已废弃。
- **相对日期换算成绝对日期**（如"今天"→ `2026-06-02`）。
- 文档间用相对路径互链；引用代码用 `文件:行号`。
- 架构性改动**必须写 ADR**（[`../adr/`](../adr/)，Nygard 风格：Context/Options/Decision/Consequences，至少引 1 个同行项目）。

## 与代码约定的衔接（详见根 `CLAUDE.md`）
- 代码注释中文、禁无用注释；命名自解释。
- 双语 UI（i18next），新增字符串同时给 zh-CN + en。
- **禁止 fallback / 兼容兜底——失败响亮地失败。**
- Conventional Commits；危险操作（删除/数据库/生产/`git push`）需先确认。

## 给 AI agent 的接力提示
- **先读** `docs/README.md` → `progress/PROGRESS.md` → 最近的 `tasks/*.md`，再动手。
- 不确定先查代码/上游文档，仍不确定再问人；**不臆测、不迎合**。
- 完成后务必回写 Outcome 文档 + PROGRESS，否则下一棒会丢失上下文。
