# ADR-0006：内部扩展点 schema v0——dogfood 优先，Markdown Live Preview 作首个消费者

- 状态：⏳ Proposed（2026-06-03）
- 关联：[`0002-markdown-live-preview.md`](0002-markdown-live-preview.md) · [`0003-plugin-first-architecture.md`](0003-plugin-first-architecture.md) · 任务 [`0017`](../progress/tasks/0017-markdown-live-preview.md)

## Context

ADR-0003 锁定「插件优先 + dogfooding」，要求架构从第一天为生态让路、核心功能跑在与第三方一致的扩展 API 上。但 M1 已交付的全部功能（主题 / 命令 / 语言 / 查找）都是**单体焊死**——`CodeEditor.tsx` 是一张扁平硬编码的 CM6 extensions 数组，代码里**没有任何内部扩展缝**。ADR-0002 又明确要求 Markdown Live Preview 实现成「第一方插件」。

现在要动手做 MD（任务 0017），面临架构岔路。多智能体审查 + 对抗式红队核查给出两条硬约束：

- **不能直接焊死**：把 MD 焊进 `CodeEditor` 最快，但 ADR-0003 的债一分没还、与 ADR-0002 冲突、M5 必然推倒重来。
- **不能过度建设**：红队警告，抽「语言 / 命令 / 装饰 / 视图」统一扩展框架会滑向被明确放弃的「插件系统镀金版」——注册时序、生命周期、卸载是其固有复杂度，且 capability / 沙箱 / manifest 在 ADR-0003 里属于 v2+，现在做违反 YAGNI 与「不放半成品公共 API」。

需要一个既能偿还 ADR-0003 首付、又不过度建设的最小架构决定。

## Options

1. **MD 直接焊进 `CodeEditor`**：零架构投资、最快。代价：ADR-0003 债不还、ADR-0002「第一方插件」落空、M5 返工。
2. **先建完整插件系统再做 MD**：manifest + capability + 沙箱 + 公共 API 一次到位。代价：违反 YAGNI 与 ADR-0003「不放半成品公共 API」，为臆测需求过度建设。
3. **借 MD 倒逼一版最小内部扩展点 schema v0**：只定义 MD 真实需要的扩展点，MD 作唯一第一方内部消费者 dogfood，不对外暴露、不文档化、不承诺稳定、可随时重构。

## Decision

采用 **Option 3**，并严格限定边界（采纳红队修正，防滑坡）：

- **范围**：v0 **只**定义 Markdown Live Preview 真实需要的扩展点——核心是 CM6 `ViewPlugin` / `Decoration` 的「装饰提供者」接入位，以及把 MD 注册为 `.md` 的内容渲染能力。**不**抽命令注册中心、**不**抽视图 / 分屏扩展点（当前无现实第二消费者）。
- **机制复用 CodeMirror 6 自带能力**：扩展点直接架在 CM6 的 `facet` / `Extension` / `ViewPlugin` 上，**不自研**注册时序 / 生命周期 / 卸载框架。
- **消费者唯一且内部**：仅 MD 一个第一方内部消费者；**不**对第三方暴露、**不**写公共 API 文档、**不**进 manifest、**不**承诺稳定、可随时重构；接口命名标注 `internal` / `unstable`。
- **明确划归 v2 的部分**：capability 模型、沙箱、manifest、公共插件 API、Open VSX 注册表 = v2（ADR-0003），本 ADR 不碰。
- **验收硬标准**：MD Live Preview 作为「装饰提供者」**经这版内部接口接入** `CodeEditor`，而非散落 `if` 焊死——即「核心功能与未来插件走同一接入路径」的最小可证明形态。达不到此标准，则本 ADR 视为未兑现。

### 同行佐证

- **Obsidian**：基于 CM6 `ViewPlugin` / `Decoration` 实现 Live Preview，与本项目核心栈同源——扩展点形态已被验证。
- **CodeMirror 6 自身**：`facet` / `Extension` 即官方一等扩展机制，v0 不重造轮子。
- **VS Code contribution points**：作为「插件优先」的长期形态参照，但其 manifest / capability 属 v2，不进 v0。

## Consequences

- ✅ 偿还 ADR-0003「第一天为生态让路」的最小首付；MD 是首个 dogfood，证明扩展缝真实可用。
- ✅ **双向门**：v0 schema 被 MD 压出来若发现不行，可在数周内重凿，损失可控（未对外承诺）。
- ✅ 避开「镀金版」过度建设（YAGNI）。
- ⚠️ **滑坡风险**：v0 一旦被理解成「长得像公共 API、第三方能照抄」就成事实上的半成品 API → 守则：不文档化、不进 manifest、命名标注 internal/unstable。
- ⚠️ schema 须在动手前先写草案（本 ADR「Decision 范围」即草案锚点），实现中按 MD 真实需要微调并回写本文件。
- 📝 命令 / 视图 / 文件处理器等其余扩展点，待出现真实第二消费者时再纳入（YAGNI）。
