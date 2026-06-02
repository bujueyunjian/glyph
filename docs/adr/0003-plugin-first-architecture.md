# ADR-0003：插件优先架构，核心功能 dogfood 同一套扩展 API

- 状态：✅ Accepted（方向）/ 📝 细节待补（2026-06-02）
- 关联：[`../architecture/plugin-architecture.md`](../architecture/plugin-architecture.md)

## Context

调研中**排第一的长期风险**是生态护城河：VS Code 的真正锁定是扩展 + LSP + 远程开发；**插件生态薄会直接拖死产品（Lapce 的死法）**。利益相关方也明确希望"提供丰富的插件生态"。但 v1 不应放半成品公共 API，旗舰功能（如 Markdown WYSIWYG）品质也必须自控。

## Options

1. **单体内建**：核心功能硬编码进内核，插件是事后附加层。
2. **插件优先 + dogfooding**：核心功能（语言/主题/命令/MD 预览）实现成第一方插件，跑在与第三方相同的 API 上；v1 先打磨内部 API，v2+ 再开放公共 API + 市场。
3. **完全外包给插件**：内核极薄，一切靠第三方。

## Decision

采用 **Option 2：插件优先 + dogfooding**。
- v1：建立**插件优先的内部架构**，核心功能 dogfood，**绝不把自己焊死**；不开放半成品公共 API。
- v2+：稳定公共插件 API + 沙箱（capability 模型）+ Open VSX 式开放注册表。

### 依据
- dogfooding 让插件系统经受真实压力（能撑 WYSIWYG 就足够强），同时掌控旗舰品质。
- capability 模型与 Tauri 2 安全模型、ACP/agent 权限模型统一。
- 避开 VS Code 市场授权锁定 → 走开放注册表（Open VSX）。

### 同行佐证
- **VS Code / Zed**：核心功能建在与第三方相同的扩展 API 上。
- **Lapce**：WASI 插件（capability 跨语言隔离）的参照；亦是"生态薄拖死产品"的反面教材。

## Consequences

- ✅ 从架构层为生态护城河让路，不必后期返工。
- ⚠️ 内部 API 设计需前瞻但不过度（YAGNI）：预留扩展点 schema（语言/命令/主题/装饰/视图/文件处理器），不为臆测需求建设。
- 📝 待补：沙箱选型 ADR（WASI vs JS worker/QuickJS）、capability 清单、插件 manifest 格式、公共 API 稳定化标准。
- v1 不交付：公共 API、插件市场、远程开发扩展。
