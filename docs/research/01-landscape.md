# 调研 · 竞品与版权全景

- 状态：✅ 完成（2026-06-02）· 已过版权专项对抗式核查
- 综述见 [`00-summary.md`](00-summary.md)；来源见 [`sources.md`](sources.md)

## 版权与商用安全（核查通过）

| 编辑器 | 许可证 | 公司商用 | 备注 |
|---|---|---|---|
| Notepad++ | GPLv3+ | ✅ 免费 | 仅 Windows；GPL 不约束"使用" |
| Sublime Text | 专有 | ❌ 需付费 | 个人 $99；企业 $50–65/席/年，个人 license 不覆盖组织 |
| VS Code（官方包） | 专有 EULA | ◐ 灰色 | 源码 MIT，二进制专有 + 遥测 + 市场锁定 |
| VSCodium | MIT | ✅ 免费 | 干净重构建，走 Open VSX，扩展更少更旧，仍是 Electron 体积 |
| Zed | 编辑器 GPL-3.0 / server AGPL / GPUI Apache-2.0 | ✅ 内部使用无碍 | copyleft 仅在分发修改版/对外改版服务时触发 |
| Lapce | Apache-2.0 | ✅ 免费 | 最宽松，但不成熟 |
| Helix | MPL-2.0 | ✅ 免费 | 弱 copyleft（文件级），很友好 |
| Neovim | Apache-2.0 + Vim license | ✅ 免费 | 双许可 |
| Pulsar（前 Atom） | MIT | ✅ 免费 | Electron 重 |
| Lite XL / Micro | MIT | ✅ 免费 | 极轻 |
| Kate / Geany | LGPL/GPL · GPLv2 | ✅ 免费 | 平台/视觉局限 |
| Nova（Panic） | 专有 | ❌ 付费 | 仅 macOS，$99/年；原生精致度的标杆 |

## 各竞品的"一句话教训"

- **Sublime**：传奇的速度 + Goto Anything + 多光标 + 命令面板——现代品类的模板。
- **VS Code**：真正的护城河是**生态（LSP + 扩展 + 远程开发）**，不是内核。
- **VSCodium**：证明"要 VS Code 体验但不要那些约束"的需求真实存在，但它只是下游重构建，非全新设计。
- **Zed**：绕开浏览器引擎、原生 GPU 渲染——**速度与美可以兼得**。
- **Lapce**：愿景全对（轻 + 现代 + 美 + OSS + Apache），但**执行/稳定性/生态决定生死**，它没做到。
- **Helix**：开箱即用、零配置 LSP 是杀手锏——但**主流 GUI 编辑器不能强制模态**。
- **Neovim**：可扩展 + LSP 优先培养忠诚度，但"需要自己攒配置"与"开箱即美"相反。
- **Pulsar**：可魔改/社区可贵，但在老 Electron 上重建，背上了正要规避的体积。
- **Lite XL**：~3MB 包 / ~10MB 内存——**拒绝 Electron 就能极致轻**的活证据。
- **Nova**：原生 Mac 工艺（排版/动效/集成）是"美"的标杆，但单平台 + 专有，出局。

## 结论：空白与楔子

- **空白**：宽松 OSS + 公司零成本 + 原生轻量 + 开箱即美 + 非模态友好 + 开箱即用 LSP/Git + 跨平台——无人占据。
- **最锋利的楔子**：「一家公司能免费铺给 500 名开发者、无需买授权、无需法务审查、跨平台、又快又美的 Notepad++/Sublime 替代品。」
- **Notepad++ 的跨平台缺口**：海量喜欢它"快 + 免费"的用户，没有同等手感的 macOS/Linux 一等替代。
