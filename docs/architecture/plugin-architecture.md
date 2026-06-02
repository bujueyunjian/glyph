# 插件优先架构

- 状态：📝 大纲（2026-06-02）—— v1 仅落"插件优先的内部架构"，公共 API + 市场是 v2+
- 决策见 [`../adr/0003-plugin-first-architecture.md`](../adr/0003-plugin-first-architecture.md)

---

## 为什么这是第一原则

调研中**排第一的长期风险**是生态护城河：VS Code 的真正锁定是扩展 + LSP + 远程开发，不是内核；**插件生态薄会直接拖死产品（Lapce 的死法）**。因此 Glyph 从架构层就是**插件优先**。

## 核心理念：dogfooding

> 核心功能（Markdown Live Preview、语言支持、主题、命令）**都实现成"第一方插件"**，跑在与第三方完全相同的扩展 API 上。

- 既掌控旗舰功能品质（内建），又让插件系统经受真实压力（它要能撑起 WYSIWYG，就足够强）。
- 对外传递明确信号：这是一个可扩展、插件优先的编辑器。
- 这正是 VS Code / Zed 的做法。

## 扩展点（v1 至少预留接口，不一定全开放）

- **语言**：tree-sitter grammar + LSP 配置（按需懒加载/懒启动）。
- **命令**：注册到命令面板（带快捷键、可被 Goto 检索）。
- **主题**：填 token 色槽（加载期过对比度校验）。
- **编辑器装饰**：CM6 decorations（Live Preview 即用此机制）。
- **视图/面板**：侧栏、底栏面板贡献点。
- **文件类型处理器**：自定义渲染（如 MD 预览）。

## 沙箱与安全（关键开放问题，v1 定方向）

候选方案（待 ADR 细化）：
- **WASI 插件**（Lapce 路线）：强隔离、跨语言（C/Rust/AssemblyScript），但 DX 较重。
- **JS 沙箱**（独立 worker / QuickJS）：DX 好、贴合 Web 前端，但隔离弱、需严控能力。
- 倾向：**能力（capability）模型**——插件显式声明所需权限（fs/网络/进程），默认拒绝，与 Tauri 2 的 capability 安全模型同构。

## 与 Open VSX 的关系

- 避开 VS Code 应用市场的授权锁定，**插件分发走 Open VSX 式开放注册表**（v2+）。
- v1 不放半成品公共 API；先把内部 API 打磨到核心功能 dogfood 顺手，**绝不把自己焊死**。

## v1 / v2 切分

| 能力 | v1 | v2+ |
|---|---|---|
| 内部扩展架构（核心功能 dogfood） | ✅ | —— |
| 稳定公共插件 API | ❌（不放半成品） | ✅ |
| 插件沙箱（capability 模型） | 📝 定方向 | ✅ 落地 |
| 插件市场 / Open VSX 注册表 | ❌ | ✅ |
| 远程开发扩展 | ❌ | ⏳ 评估 |

> 待办：补全扩展点 schema、沙箱选型 ADR、capability 清单、插件清单（manifest）格式。
