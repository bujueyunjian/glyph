# Glyph 架构总览

- 状态：✅ 立项基线（2026-06-02）
- 关联：[`plugin-architecture.md`](plugin-architecture.md) · [`ai-agent-architecture.md`](ai-agent-architecture.md) · ADR [`0001`](../adr/0001-tauri-codemirror-stack.md)
- 原则：分层清晰、依赖方向单一、**失败响亮**、不写降级/兼容兜底。

---

## 1. 进程模型

```
┌──────────────────────────────────────────────────────────────┐
│  Glyph 进程（Tauri 2）                                          │
│                                                                │
│  ┌───────────────────────────┐      ┌──────────────────────┐  │
│  │ WebView（前端，薄渲染层）   │ IPC  │ Rust 核心（重活）      │  │
│  │ React 19 + CodeMirror 6   │◄────►│ 文件 I/O / 索引 / 搜索 │  │
│  │ Tailwind v4 + shadcn      │ call │ 文件监听 / 进程编排    │  │
│  └───────────────────────────┘      └──────────┬───────────┘  │
│         │ tree-sitter(WASM)                     │ spawn         │
│         │ 语法高亮在前端                         ▼               │
│         │                          ┌────────────────────────┐  │
│         │                          │ sidecar 子进程（按需）  │  │
│         └─ LSP 桥接 ◄──── stdio ──│  · LSP 语言服务器       │  │
│                                    │  · ACP agent(Claude/    │  │
│                                    │    Codex/Copilot CLI)   │  │
│                                    │  · MCP server           │  │
│                                    └────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

**铁律**：WebView 只做渲染与交互；一切重活（磁盘、索引、ripgrep 式搜索、文件监听、子进程编排）在 Rust。这是达成 footprint 与延迟 SLO 的前提。

## 2. 前后端边界（沿用 git-ai-studio 约定）

- 每个 Tauri command 在前端经 `src/api/ipc.ts` 的统一 `call<T>()` 封装，并按模块拆 `src/api/{模块}Api.ts`（如 `appApi.ts`）；**UI 绝不直接 `invoke`**。
- command 在 `src-tauri/src/lib.rs` 的 `invoke_handler!` 注册，实现在 `src-tauri/src/commands/*`。
- 共享 TS 类型集中在 `src/types/`（如 `appTypes.ts`）；契约测试 `src/__tests__/*.contract.test.ts` 断言 TS ↔ Rust 对齐。
- 错误二分：预期内空态返回 `Ok(Degraded { reason })` → 前端渲染空态；真实失败返回 `Err(String)` → 红 toast。**绝不用零值/静默兜底掩盖失败。**

## 3. 模块分层（规划）

### 前端 `src/`（命名与目录见 [`../standards/naming.md`](../standards/naming.md)，取自 specflow 规范）
```
src/
├── main.tsx / App.tsx          入口、顶层组合
├── api/                        Tauri IPC 封装（禁止组件直接 invoke）
│   ├── ipc.ts                  call<T>() 统一封装（类比 axios request）
│   └── {模块}Api.ts            如 appApi.ts / fileApi.ts
├── types/                      TS 类型（appTypes.ts，与 Rust 对齐）
├── components/
│   ├── common/                 基础 UI（Base 前缀）
│   ├── workbench/              外壳：WorkbenchLayout / StatusBar / EmptyState
│   └── editor/                 CodeMirror 6 集成：CodeEditor / 语言注册 / 主题
├── constants/                  常量与枚举（UPPER_SNAKE）
├── hooks/                      use 前缀
├── utils/                      工具函数（动词+对象）
├── i18n/                       多语言（index.ts + locales/{zh-CN,en}.json）
└── styles.css                  Tailwind v4 入口 + 设计 token
```
> 后续模块（命令面板 / Markdown Live Preview / AI-agent UI）按功能就近建子目录，遵循同一命名规范。

### 后端 `src-tauri/src/`
```
src-tauri/src/
├── main.rs                     入口
├── lib.rs                      invoke_handler! 注册 + 插件装配
├── commands/                   每个能力一个文件（fs / search / lsp / agent ...）
├── fs/                         文件读写、原子保存、监听
├── search/                     ripgrep 式搜索/索引（off-main）
├── lsp/                        LSP 子进程编排 + stdio 桥
├── agent/                      ACP 宿主 + MCP 客户端
└── plugin/                     插件运行时（见 plugin-architecture.md）
```

## 4. 关键数据流

- **打开文件**：UI → `call("open_file", {path})` → Rust 读盘（含编码探测/大文件判定）→ 返回内容 + 元信息 → CodeMirror 渲染 → 前端按扩展名懒加载 tree-sitter grammar 高亮。
- **保存文件**：UI → `call("save_file", {path, content})` → Rust **原子写**（temp + rename）→ 返回结果 → 清脏标记。
- **大文件**：Rust 端判定（尺寸/单行长度）→ 标记 `large_file_mode` → 前端只读、不换行、不高亮，避免冻结。
- **LSP/agent**：懒启动 sidecar，stdio 桥接，进度/diff 流式回传 UI。

## 5. 跨平台注意（来自团队既有经验）
- Windows 下 `proc.rs` 之外起的子进程必须打 `CREATE_NO_WINDOW`，否则 release 闪黑色控制台。
- Linux WebKitGTK 碎片化是头号风险 → CI 发行版矩阵 + .deb/.rpm/AppImage。
- release profile 体积优化：`codegen-units=1 / lto="thin" / opt-level="s" / strip="symbols"`。

## 6. 性能守门（架构级要求）
- 键入延迟 + 帧时进 CI 自动化门禁（见 [`../design/design-system.md`](../design/design-system.md) B 节）。
- 第一天就建**键入延迟原型**验证 Web 栈可达 SLO（见 [`0001` ADR](../adr/0001-tauri-codemirror-stack.md) 的风险与逃生口）。
