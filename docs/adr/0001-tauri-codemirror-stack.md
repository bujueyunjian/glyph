# ADR-0001：技术栈采用 Tauri 2 + CodeMirror 6 + tree-sitter + LSP

- 状态：✅ Accepted（2026-06-02）
- 关联：[`../research/02-tech-stack.md`](../research/02-tech-stack.md)

## Context

Glyph 要做一个**比 VS Code 轻一个数量级、开箱即美、跨平台、开发者优先**的代码编辑器，且利益相关方有硬约束：**只用主流、经过验证的技术，禁止过时/未验证技术**。同时设计体系要求严苛的延迟与 footprint SLO（见 [`../design/design-system.md`](../design/design-system.md)）。

## Options

1. **Tauri 2（Rust 核心 + 系统 WebView）+ CodeMirror 6**
2. **Electron + Monaco**（VS Code 同款）
3. **原生 Rust + GPU（GPUI/floem 类）+ 自研 rope 渲染**（Zed/Lapce 路线）

## Decision

采用 **Option 1：Tauri 2 + CodeMirror 6 + tree-sitter(WASM) + LSP（`@codemirror/lsp-client` v6.2.2 驱动，语言服务器作 sidecar 子进程）**。前端 React 19 + TS 5.8 + Vite 7 + Tailwind v4 + shadcn/Radix，对齐团队既有 git-ai-studio 约定。

### 依据
- **主流且经验证**（满足硬约束）：Tauri 2（Spacedrive/Hoppscotch/AppFlowy）、CodeMirror 6（Replit/Sourcegraph/Firefox DevTools）、tree-sitter+LSP（Zed/Helix/Neovim）。
- **团队契合**：本团队已生产跑 Tauri（cc-switch、git-ai-studio）→ Rust 接缝/签名/CI 是已知量，塌缩了学习曲线风险。
- **footprint**：复用系统 WebView（无捆绑 Chromium）+ CM6 ~50–300KB 核心（无 5–10MB Monaco）→ 目标 <15MB 安装 / <40MB 内存 / <500ms 启动。Electron 做不到（它就是 VS Code 架构）。
- **设计可塑性**：Web UI 最易做到像素级精致（满足"开箱即美"）。

### 为何否决其他
- **Electron**：直接违背"明显比 VS Code 轻"。
- **原生 GPU**：延迟天花板最高，但 GPUI/floem 单厂、Rust GUI 生态分散无主导者 → 违背"只用主流验证技术"，开发成本/周期最大。**列为长期逃生口**，非 v1。

## Consequences

- ✅ 同时满足"轻 + 主流 + 团队契合 + 可做美"。
- ⚠️ **延迟代价**：Web 栈做不到 Zed ~2ms 键入极限。**对策**：第一天建键入延迟原型作 CI 守门；正常编辑需落在 <16ms/帧。若撞硬墙，逃生口是原生 GPU 重写。
- ⚠️ **头号风险 Linux WebKitGTK 碎片化**：CI 发行版矩阵 + .deb/.rpm/AppImage + Linux 专属 CSS 降级。
- ⚠️ CM6 超长单行/压缩文件弱 → "大文件模式"（只读/不换行/不高亮），重搜索/索引交 Rust。
- ⚠️ `@codemirror/lsp-client` 年轻（6.x），实战或需自封装让 LSP 跑 web worker，预留集成成本。
- 📌 只用 Tauri 2.x 文档化 API，不围绕未稳定的 "Tauri 3.0/WASM 沙箱" 设计；精确锁版本。
