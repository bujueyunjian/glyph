# 任务 0041:可见化——状态栏 + 全新 logo + 文件关联 + LSP 指示器

- 状态:✅ 落地并过 `pnpm check`(75 前端 + 18 Rust + 2 e2e)+ build/budget;Playwright 实测可见
- 里程碑:体验/品牌 · 负责人:Claude · 开工/收工:2026-06-04

> 起因:用户反馈"页面功能没变"。根因——大量功能藏在命令面板/快捷键后,主界面不变;且 logo 是默认占位、LSP 纯后端不可见。本任务让改动**肉眼可见**。

## 改动
1. **状态栏升级**:从只显"就绪" → 左显当前文件名+语言、右为可点入口(搜索/分屏/命令面板)。功能不再只藏快捷键后。WorkbenchLayout 改 statusBar 槽位注入。
2. **全新 logo**(Jobs 取向:一个克制有力的字形 + 文本光标点明代码编辑器):深色 squircle + 蓝渐变 G。`src/assets/logo.svg`;EmptyState 用品牌标;SVG favicon;`pnpm tauri icon` 从 SVG 重生成全平台 app 图标(透明圆角)。Playwright 截图迭代确认观感。
3. **文件关联**("用 Glyph 打开"):tauri.conf `fileAssociations` 注册 ~50 扩展名;`launch.rs`(argv 冷启动)+ lib.rs `RunEvent::Opened`(macOS)→ `open-external-file` 事件 + LaunchFile 兜底;前端挂载轮询 + 监听 → 打开。
4. **LSP 指示器**:`useLsp` 按文件语言自动连服务器(rust-analyzer 等,同语言同根复用,未装则静默 unavailable),状态栏显示服务器名 + 状态点。让已验证的 LSP 后端可见。
5. 修硬编码 `v0.0.1` 版本兜底(无 Tauri 时不显伪版本)。

## 验证
- ✅ `pnpm check` 全绿(75 前端测试,+serverForExtension 3 + launch 1);clippy 干净;build/budget 达标。
- ✅ **Playwright 实测**:新 logo 显示于空态、状态栏入口可见且点击命令面板入口能开面板。
- ⏳ 需安装包/显示环境验:OS"打开方式"实际打开、LSP 连真实服务器后状态点变绿、补全/诊断入编辑器(下一步)。
