# 任务 0043:LSP 核心补齐 + AI 侧栏 + 检查更新 + 可日用打磨(v0.0.6–v0.0.10)

- 状态:✅ 落地并过 `pnpm check`(97 前端 + 18 Rust + 2 e2e);发布至 v0.0.10
- 里程碑:pantheon 路线图 A/B/C/D/E · 负责人:Claude · 2026-06-04

> 承 0041/0042。pantheon 裁决 A→B→C→D→E,本程按「可验证优先」走完并发布。

## 关键认知:headless 也能验
- **后端**:装 rust-analyzer 后,LSP 全链路可对真实服务器跑 cargo e2e。
- **视觉**:`pnpm dev` + Playwright 截图可肉眼验纯前端 UI(logo / 状态栏 / Agent 侧栏 / 用 harness 验 Markdown Live Preview)。
- 据此,把"必须显示环境"的判断从 LSP/视觉上摘除,推进了一大批此前判为阻塞的项。

## 交付(pantheon 路线图)
- **A · LSP 核心**:补全 + 诊断 + 悬停 + 转到定义(F12)+ 格式化(⇧⌥F)+ 重命名(F2)。协议在 Rust(铁律),前端 `protocol.ts` 纯转换(位置/补全/诊断/hover/definition/TextEdit/WorkspaceEdit,**全单测**)+ `editor.ts`(补全源/诊断/hover/didOpen/didChange)。`useLsp` 按语言自动连服务器 + 状态栏指示器。
- **B · Agent 侧栏**:AgentPanel(命令配置 + 内联追问 + 流式响应)取代模态弹窗;复用已修流式后端(turn 过滤/可取消/stderr 响亮)。
- **C · Live Preview**:经 Playwright harness 验 + 修链接(只留文本)。
- **D · 可日用**:字体族设置 · 关闭其他/全部标签 · (前置:最近文件夹/会话续上/状态栏入口)。
- **E · 更新**:检查更新(GitHub Releases 比对,无证书)。代码签名/公证需 Apple/MS 付费证书(剩余)。

## 验证
- ✅ `pnpm check` 全绿(97 前端测试);clippy 干净;build + budget 首屏 <140KB。
- ✅ LSP 数据链对真实 rust-analyzer e2e;视觉(logo/状态栏/agent 侧栏/MD 预览)Playwright 实测。
- ✅ 发布 v0.0.6 → v0.0.10(逐版 4 平台 CI 绿)。
- ⏳ 真机:补全弹窗/诊断波浪线像素观感、agent 真实对话(ACP key)、原生「打开方式」需运行 app 肉眼验。

## 剩余(硬卡外部凭据)
- E 代码签名/公证/自动更新包:Apple Developer ID + Windows 证书 + minisign 密钥(GitHub secret)。
- 真机运行验证:显示器 + ACP agent key。
