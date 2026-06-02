# Glyph PR-FAQ

- 状态：✅ 立项基线（2026-06-02）
- 体例：亚马逊式 PR-FAQ（先写"新闻稿"，再答疑）。与 [`vision.md`](vision.md) 互补：vision 给完整论证，本文给对外口径与风险口径。

---

## 新闻稿（设想中的发布）

**Glyph 发布：又快、又轻、又美，任何 AI agent 都能插进来的开源代码编辑器。**

今天，Glyph 面世——一个面向受版权与合规约束的公司的免费、开源、跨平台代码编辑器。它比 VS Code 轻一个数量级（安装 <15MB、内存 <40MB、冷启动 <500ms），开箱即是精致的现代界面，且无需购买任何授权、无需法务审查即可铺给整支开发团队。

Glyph 不与 Cursor/Windsurf 拼自建 AI，而是成为**最快、任何 agent 都能插进来的编辑器**：通过开放标准 MCP 与 ACP，Claude Code、Codex、Copilot CLI 可直接作为子进程在编辑器内运行——账单与条款都在用户与 agent 厂商之间。它还内建写作级 Markdown 实时预览，写文档比专门的 Markdown 应用还顺手。

## 常见问答

**Q1：和 VS Code / VSCodium 有什么不同？**
更轻一个数量级（非 Electron）、宽松许可证、无市场锁定、agent 宿主中立、写作级 Markdown。我们不追功能广度，追"轻快美 + agent + 写作"三角。

**Q2：和 Zed 有什么不同？**
Zed 优秀但 GPL/AGPL、Rust 原生重、偏 AI 云、Mac 出身。Glyph 走 Tauri + Web UI（更易做美、团队已验证）、宽松许可证（消除采购摩擦）、agent 宿主保持多厂中立。坦诚的取舍：键入延迟极限不及 Zed 的原生 GPU，但落在"感觉即时"区间。

**Q3：为什么不自己做 AI/大模型？**
in-editor AI 已商品化，自建是烧钱必输的偏题。做 agent 宿主零模型开销、零 ToS 暴露，且押的是中立开放标准。

**Q4：Markdown 为什么不做成纯 Typora？**
走 Obsidian 式 Live Preview（source-of-truth），拿到 ~90% 魅力却避开 contenteditable 的脆弱；可叠加全 WYSIWYG 模式。技术上 Obsidian 正基于 CodeMirror 6，与我们同源。

**Q5：插件生态什么时候有？**
架构从 v1 就是插件优先、核心功能 dogfood 同一套 API；稳定公共 API + 市场（Open VSX 式）在 v2+，不放半成品。

**Q6：商业模式？**
编辑器本体永远免费开源。后续可选面向团队/企业的增值（策略管理/私有插件市场/SSO/审计/托管同步）。

## 风险口径（对外诚实，对内警觉）
- **延迟天花板**：Web 栈 <8ms 难，需延迟原型守门，原生 GPU 作逃生口。
- **生态护城河**：插件生态薄会拖死产品（Lapce 教训）——架构层已应对，但执行是关键。
- **强劲对手**：Zed 有 VC、周更、日益跨平台，差异化必须锋利，不能只是"又一个快编辑器"。
- **Linux WebKitGTK 碎片化**：头号工程风险，CI 矩阵 + 多格式打包。

> 对外材料的事实数字以 [`../research/00-summary.md`](../research/00-summary.md) 的**核查修正版**为准。
