# 任务 0019：跨平台发布 CI（push 标签 → 构建多平台安装包）

- 状态：🚧 工作流落地 + 本地 macOS 打包验证；多平台真跑待 push 到 GitHub
- 里程碑：M6（发布与分发）首步 · 关联任务：—（TaskList）· 负责人：Claude
- 开工：2026-06-03 · 收工：——

> 规范见 [`../../workflow/doc-driven-workflow.md`](../../workflow/doc-driven-workflow.md)。

---

## Plan（开工前）

### 背景 / 目标
Glyph 已有 GitHub remote（`github.com/bujueyunjian/glyph.git`）但只有 ubuntu 门禁 CI，无发布流水线。目标：push 标签即在三平台构建安装包并发 GitHub Release。参照姊妹项目 `git-ai-studio` 的成熟 release 流水线，按 Glyph 现状裁剪。

### 范围 / 非范围
- 范围：
  - `release.yml`：tag `v*` / 手动 dispatch 触发，矩阵构建 **Windows(NSIS) · macOS(Universal dmg) · Linux x86_64(deb+AppImage) · Linux ARM64(deb+AppImage)**，收集重命名为 `Glyph-<版本>-<平台>.<ext>`，tag 时经 `softprops/action-gh-release` 发布。
  - `ci-cross-platform.yml`：macOS + Windows 上 `cargo check/test` 冒烟，捕获平台特有编译错误（如 `proc.rs` 的 `#[cfg(windows)] CREATE_NO_WINDOW`）。
- 非范围（明确不做，与姊妹的差异）：
  - **updater / `latest.json` / minisign 签名**——Glyph 无 updater 配置（无 pubkey/密钥）；自更新属 M6，需单独决策 + 密钥下发后再加。
  - **Apple 代码签名 / 公证**——需 Apple 证书；当前出**未签名**包（Gatekeeper 会提示），属 M6。
  - Windows 用 **NSIS**（Glyph 已配，免 WiX 依赖），不出 MSI。

### 涉及文件
- `.github/workflows/release.yml`（新）
- `.github/workflows/ci-cross-platform.yml`（新）
- `src-tauri/tauri.conf.json`（已含 bundle targets + 图标，未改）

### 验证计划
- [ ] YAML 语法可解析
- [ ] 本地 `pnpm tauri build --bundles dmg`（macOS host）真出 dmg，证明 bundle 配置/图标/打包链路可用
- [ ] push 到 GitHub 后多平台矩阵真跑（需用户操作；本环境无法跑 GitHub Actions）

### 风险与对策
- GitHub Actions 无法在本环境执行 → 工作流对齐姊妹已验证写法 + 本地至少验 macOS 一条腿；其余平台 push 后观察。
- Linux ARM64 用 `ubuntu-22.04-arm` runner（GitHub 已 GA）；若不可用回退 QEMU 交叉编译。
- 未签名 macOS 包 Gatekeeper 拦截 → 文档提示用户右键打开;签名留 M6。

---

## Outcome（2026-06-03）

### 实际改动
- `.github/workflows/release.yml`：4 平台矩阵（Windows NSIS / macOS Universal dmg / Linux x86_64 deb+AppImage / Linux ARM64 deb+AppImage）+ tag 时 `softprops/action-gh-release` 发布。
- `.github/workflows/ci-cross-platform.yml`：macOS + Windows 上 `cargo check/test` 冒烟。
- `src-tauri/tauri.conf.json`：identifier `com.glyph.app` → **`com.glyph.editor`**（Tauri 警告 `.app` 后缀与 macOS 应用包扩展名冲突）。

### 验证结果
- ✅ 三个工作流 YAML 经 ruby 解析通过。
- ✅ **本地 `pnpm tauri build --bundles dmg`（macOS host arch）成功**：release 二进制（1m33s）+ `Glyph.app` + `Glyph_0.0.1_aarch64.dmg` 产出 → 打包链路 / 图标 / bundle 配置可用,release.yml 的 macOS 腿可靠。
- ⏳ 四平台矩阵 + Release 发布需 push 到 GitHub 真跑（本环境无法跑 GitHub Actions）。

### 遗留问题
- macOS / Windows 未代码签名 / 公证（Gatekeeper 会提示;留 M6,需 Apple 证书）。
- updater / `latest.json` 未做（留 M6,需 minisign 密钥）。
- Linux ARM64 依赖 `ubuntu-22.04-arm` runner 可用性,首次需观察。

### 下一步
- 合并到 main + 打 `v0.0.1` 标签 push,触发 release.yml；在 GitHub Actions 观察四平台构建 + Release 产物。
