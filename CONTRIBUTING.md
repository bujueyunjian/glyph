# 贡献指南

感谢参与 Glyph！本项目**慢而稳、文档驱动**，请先读完本指南与 [`docs/workflow/doc-driven-workflow.md`](docs/workflow/doc-driven-workflow.md)。

## 开工前

1. 读 [`docs/progress/PROGRESS.md`](docs/progress/PROGRESS.md)（方向与状态）→ [`docs/product/vision.md`](docs/product/vision.md) → 相关 [`docs/adr/`](docs/adr/)。
2. 在 [`docs/progress/tasks/`](docs/progress/tasks/) 新建 `NNNN-<slug>.md`（基于 `TEMPLATE.md`），先写 **Plan**（可先大纲）。

## 编码原则

- **先读后写**：改前看相近实现（含姊妹项目 `../git-ai-studio`），保持一致。
- **根因优先**：Bug 定位根因再修，禁止临时绕过。
- **最小变更 / 范围对齐**：只改任务要求的；发现更优路径先提议、经确认再扩大。
- **禁止 fallback / 兼容兜底**：失败响亮地失败，不静默兜底。
- **命名自解释 / 注释克制**：中文注释，只解释"为什么"。命名**强制遵循** [`docs/standards/naming.md`](docs/standards/naming.md)（取自 specflow，角色词后缀 + 功能模块目录 + 动词+对象函数名）。
- **改动须验证**：typecheck / lint / clippy / test / build；失败如实报告。

## 提交规范

- **Conventional Commits**：`feat:` `fix:` `docs:` `refactor:` `perf:` `test:` `build:` `chore:`。
- 架构性改动**必须附 ADR**（[`docs/adr/`](docs/adr/)，Nygard 风格，至少引 1 个同行项目）。
- 双语 UI：新增用户字符串同时给 `zh-CN` + `en`。
- **危险操作（删除/数据库/生产/`git push`）需先确认**。

## 质量门禁

```bash
pnpm check   # typecheck + lint + format:check + rs:fmt + rs:clippy
pnpm test    # vitest
pnpm rs:test # cargo test
```

判定标准：**不新增** lint 警告；性能相关改动不得回归 SLO（见 [`docs/design/design-system.md`](docs/design/design-system.md)）。

## 收工后

1. 回填任务文档的 **Outcome**（实际改动 / 验证结果 / 遗留 / 下一步），失败如实写。
2. 更新 [`docs/progress/PROGRESS.md`](docs/progress/PROGRESS.md) 与（如涉及方向）[`docs/roadmap/roadmap.md`](docs/roadmap/roadmap.md)。
3. 按 Conventional Commits 提交。

## 给 AI agent（Claude Code / Codex）的提示

先读 `docs/README.md → PROGRESS.md → 最近 tasks/*.md` 再动手；不臆测、不迎合；完成后务必回写 Outcome + PROGRESS，否则下一棒丢上下文。
