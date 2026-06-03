# 任务 0018：Agent 宿主地基 spike（proc.rs 子进程闭环）

- 状态：⏳ 计划中（可选 / 并行，视人力）
- 里程碑：M4（差异化支柱③）地基预研 · 关联任务：#?（TaskList）· 负责人：待定
- 开工：—— · 收工：——

> 规范见 [`../../workflow/doc-driven-workflow.md`](../../workflow/doc-driven-workflow.md)。开工前填「Plan」，收工后补「Outcome」。
> 架构依据：[`../../adr/0004-ai-agent-host-mcp-acp.md`](../../adr/0004-ai-agent-host-mcp-acp.md)。

---

## Plan（开工前）

### 背景 / 目标

支柱③「Agent 宿主（MCP 客户端 + ACP 本地宿主）」是调研三处一致认定的**唯一真差异化 + 唯一无人占据的缺口**（VS Code 仅社区 ACP 扩展、无原生支持），且 100% 命中目标用户（受合规约束、人手 Claude Code/Codex 的公司开发者）。但其底层能力**全部为零**：后端仅 165 行，无子进程框架（`proc.rs`）、无 stdio JSON-RPC、无 Rust→UI 推送通道、无权限提示。

战略红队证伪指出：「地基为零所以不做」是**用工程难度绑架战略**——而 ③ 的窗口由周更的 ACP 主导者 Zed 把守。但 pantheon 的 Jensen 纪律同样成立：在无物理判断缓冲 + ACP 远程传输 spec 缺席时 **all-in ③ 是鲁莽**。

本任务取两者交集：**不做 M4 全量，只把 ③ 从「地基为零」变成「窗口可随时进入」**，守住竞争窗口；同时顺带建成 A（文件树刷新）/ D（LSP 诊断推送）/ F（外部改动检测）共用的 Rust→UI 推送地基。

### 范围 / 非范围

- 范围（最小闭环 spike）：
  1. `src-tauri/src/proc.rs`：spawn 本地子进程 + stdio 双向 JSON-RPC；Windows 打 `CREATE_NO_WINDOW`（否则 release 闪黑窗）。
  2. **Rust→UI 流式通道**：Tauri `emit` / `Channel`，打通后端主动推 UI（当前完全缺失）。
  3. **权限提示骨架**：`fs/write`、`terminal/*` 类敏感操作的显式授权拦截位（ACP 安全红线，一等公民）。
  4. **最小验证闭环**：spawn 一个本地 echo / ACP-stub 子进程并完成一次 stdio 往返，前端订阅到流式输出。
- 非范围（明确不做，属 M4 全量）：完整 ACP / MCP 协议实现、远程 / 云 agent（ACP 远程传输 spec 缺席）、终端接管、流式 diff 审查 UI、provider 路由、in-editor AI 补全 / 改写。

### 方案大纲

- `proc.rs` 封装子进程生命周期（spawn / 写 stdin / 读 stdout 行 / kill），协议层用薄适配隔离 ACP spec churn（ADR-0004「client 适配层隔离」）。
- 推送：后端事件 → `emit` → 前端 `api/agentApi.ts` 经 `@tauri-apps/api/event` 订阅（沿用 `call<T>` 风格，UI 不直连）。
- 权限：敏感能力先到一个授权检查点（v0 可为「一律提示 / 拒绝」骨架），为 M4 真权限模型留接口。
- 参照姊妹项目 `git-ai-studio` 已有的子进程编排模式保持一致。

### 涉及文件

- `src-tauri/src/proc.rs`（新）—— 子进程 + stdio + CREATE_NO_WINDOW
- `src-tauri/src/commands/*` / `lib.rs` —— 注册 spawn / 通信命令
- `src-tauri/Cargo.toml` —— tauri features（event）+ 可能 tokio
- `src-tauri/capabilities/*` —— 子进程 / 事件权限
- `src/api/agentApi.ts`（新）—— 前端封装 + event 订阅
- `src/types/agentTypes.ts`（新）—— 共享类型

### 验证计划

- [ ] spawn + stdio 往返通（本地 stub 子进程）
- [ ] 前端订阅到流式输出
- [ ] Windows 无黑窗（CREATE_NO_WINDOW 生效）
- [ ] 权限骨架能拦截 fs/terminal 类调用
- [ ] rs:fmt / clippy / typecheck

### 风险与对策

- ACP spec 年轻、易变 → 适配层隔离，变更局部化（ADR-0004）。
- 跨平台子进程差异（尤其 Windows）→ 参照 git-ai-studio；CREATE_NO_WINDOW 必做。
- 这是 single bet 的**地基预研**，非全量押注 → 范围严格收在最小闭环；人力紧张时本任务可暂缓（已标可选）。
- 自我商品化风险（价值在外部 agent）→ 靠①原生速度 + UX 对冲，故①实证（0016）优先级高于本任务。

---

## Outcome（收工后）

### 实际改动
<待填>

### 验证结果
<待填；失败如实记录，附输出，不掩盖>

### 遗留问题
<待填>

### 下一步
<待填>
