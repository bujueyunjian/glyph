# 调研 · 技术栈选型

- 状态：✅ 完成（2026-06-02）· 已过技术专项对抗式核查
- 决策固化于 [`../adr/0001-tauri-codemirror-stack.md`](../adr/0001-tauri-codemirror-stack.md)

## 推荐栈（每层都主流且经验证）

| 层 | 选型 | 备选/逃生口 |
|---|---|---|
| 应用外壳 | **Tauri 2.x**（Rust 核心 + 系统 WebView） | Electron（否决：=VS Code 架构，无法更轻）/ 原生 GPU（逃生口） |
| 编辑器核心 | **CodeMirror 6** | Monaco（否决：2–5MB gzip、初始化慢）/ 原生 rope（逃生口） |
| 前端框架 | **React 19 + TS 5.8 + Vite 7**（对齐团队 git-ai-studio） | Svelte/Solid（更轻，但团队已沉淀 React 约定） |
| 语法 | **tree-sitter（WASM）** | —— |
| 代码智能 | **LSP**，经 `@codemirror/lsp-client` v6.2.2 驱动；语言服务器作 sidecar 子进程 | —— |
| 样式/组件 | Tailwind v4 + shadcn/Radix（对齐团队） | —— |
| 打包/发布 | tauri-action + GitHub Actions（签名/公证 + updater latest.json） | —— |

## footprint 目标（硬预算）

- 安装包 **< 15MB**（Windows）/ 空闲内存 **< 40MB** / 冷启动 **< 500ms** —— 约 VS Code 的 1/10。
- **如何做到轻**：不捆绑浏览器引擎；tree-shake CodeMirror、按语言懒加载语言包；tree-sitter grammar 按需 WASM 加载；LSP 按语言懒启动子进程；文件 I/O、索引、搜索（ripgrep 式）、文件监听都放 Rust，WebView 只做薄渲染层。

## 关键事实（核查后）

- **Tauri 2 production-proven**：2024-10 稳定，~107K stars；Hoppscotch / Spacedrive / AppFlowy / Padloc 在用（~~Cody 桌面端~~ 未证实，剔除）。**本团队已在生产跑 Tauri**（cc-switch、git-ai-studio）→ Rust 接缝、签名、CI 都是已知量。
- **footprint 量级真实**：Tauri 安装 ~3–15MB / RAM ~20–100MB；Electron ~50–150MB+ / ~100–300MB。Hoppscotch 迁移 Electron→Tauri：包 165MB→8MB、RAM ↓~70%。（精确数字多来自 SEO 博客，方向可靠、数值仅供参考。）
- **CodeMirror 6**：最小核心 ~50KB / 典型 ~124KB gzip / 满配 ~1.26MB；Monaco 满配 ~5MB。Sourcegraph 从 Monaco 迁到 CM6（JS 下载量 ↓43%），Replit 押注 CM6，Firefox DevTools 在用。
- **`@codemirror/lsp-client`**：**v6.2.2**（非 v6.1.0），首方维护，仓库迁 code.haverbeke.berlin（迁移≠弃坑）；但年轻，实战常需自封装让 LSP 跑 web worker，预留集成成本。
- **tree-sitter + LSP 双层**：行业标准（Zed/Helix/Neovim）。tree-sitter 增量解析 ~10x 于正则高亮、亚毫秒级，即使代码不完整也即时反馈；LSP 给语义补全/诊断/导航。互补非竞争。
- **原生 GPU（Zed/GPUI）**：Zed 1.0 于 2026-04-29 三平台齐发（Windows=DirectX11+DirectWrite），~222MB RAM、0.4–0.6s 冷启动、~2ms 延迟、120fps。但 GPUI/floem 单厂、Rust GUI 生态分散无主导者 → 对从零团队"不够主流"，作**长期逃生口**，非 v1。

## 风险与对策

| 风险 | 严重度 | 对策/逃生口 |
|---|---|---|
| **Linux WebKitGTK 碎片化**（旧发行版缺 webkit2gtk-4.1；动画模糊、contenteditable 怪异） | 🔴 高（头号） | CI 发行版矩阵；出 .deb/.rpm/AppImage 带正确依赖；Linux 专属 CSS 降级 |
| CM6 超长单行/压缩文件（50k+ 字符/行）卡顿 | 🟡 中 | 检测大/压缩文件 → 只读、不换行、不高亮的"大文件模式"；重搜索/索引交给 Rust |
| 各 OS WebView 行为漂移（Win=Chromium，mac/Linux=WebKit） | 🟡 中 | 以 WebKit 为基线写 CSS/JS；按 OS 加 shim；CI 在各平台真 WebView 上测 |
| Tauri 2.x 周期内依赖 churn / lsp-client 迁仓 | 🟢 低 | 精确锁版本；镜像关键包；跟踪官方频道 |
| Web 渲染达不到原生 120fps/2ms | 设计取舍 | 明确接受以换 footprint + 团队契合；GPUI 作逃生口 |

> 不要围绕"Tauri 3.0 / WASM 沙箱"等 2026 低权威博客内容做架构——3.0 仅是 GitHub milestone（~14%），无稳定版。**只用 2.x 文档化 API**。
