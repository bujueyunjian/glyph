# 任务 0002：项目元文件

- 状态：✅ 完成
- 里程碑：M0 · 关联任务：#2（TaskList）· 负责人：Claude
- 开工：2026-06-02 · 收工：2026-06-02

---

## Plan（开工前）
为 Glyph 建立对外/对内的元文件，仿照姊妹项目 git-ai-studio 的水准与结构。

## Outcome（收工后）

### 实际改动（新增文件）
- `CLAUDE.md` —— 项目定位/差异化三角/重要文档索引/文档驱动工作流/常用命令/架构边界/约定（中文，对齐 git-ai-studio 风格）
- `README.md` —— 英文对外门面
- `README.zh-CN.md` —— 中文对外门面
- `CONTRIBUTING.md` —— 贡献流程 / Conventional Commits / ADR / 质量门禁 / AI 接力提示
- `docs/product/PR-FAQ.md` —— 亚马逊式 PR-FAQ + 风险口径

### 关于 `/init`
用户要求用 `/init` 初始化 CLAUDE.md。因当前工作目录是父目录 `D:\mcc\ai\open`（含 6 个无关项目），在该处跑 `/init` 会扫入全部兄弟项目。故**直接为 Glyph 子项目手写**了高质量 CLAUDE.md（仿 git-ai-studio）。如需，可在 `glyph/` 目录内单独再跑 `/init`。

### 验证结果
- 元文件互链与 docs 体系一致。✅
- 常用命令章节标注"骨架建立后（任务 #3）生效"，未谎称已可运行。✅

### 遗留 / 下一步
- 任务 #3：搭建 Tauri 2 + React 19 + Vite 骨架（对齐 git-ai-studio），目标 `pnpm tauri:dev` 起空窗口。
