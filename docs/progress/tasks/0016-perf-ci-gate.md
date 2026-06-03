# 任务 0016：性能实测与 CI 门禁（键入延迟 / 冷启动）

- 状态：🚧 测试 + CI 地基完成（`pnpm check` 全绿，含 test/rs:test）；键入延迟实测（GUI e2e）待显示环境
- 里程碑：M1（贯穿始终）· 关联任务：#12（TaskList）· 负责人：Claude
- 开工：2026-06-03 · 收工：——

> 规范见 [`../../workflow/doc-driven-workflow.md`](../../workflow/doc-driven-workflow.md)。开工前填「Plan」，收工后补「Outcome」。

---

## Plan（开工前）

### 背景 / 目标

①「轻·快·美」是差异化三角的地基（vision.md「永不为其他支柱让步」），但红队核实：**「快」从未实测**——`PROGRESS.md` 只有体积背书（release 6.3MB / gzip 117KB），键入延迟 / 冷启动反复标「待本地实测」；且**用户已反馈「感觉比 Notepad++/Typora 重」**，团队拿不出数字回应。design-system B 节、overview §6、ADR-0001 三处都写明「键入延迟与帧时**必须进 CI 门禁**、**第一天就做**」，却拖了 14 个任务未动。

红队一致结论（修正初版「G 搭车」）：**这是独立的中等工程，不是 MD 的搭车项**（headless 测不了 GUI、零测试、零 CI），且**必须排在 MD 引入渲染热路径之前**——否则「先污染再立尺」，违背「延迟即产品」。

目标：给「快」装上尺子和刹车，并把唯一已投入的支柱坐实为可营销的硬证据。

### 范围 / 非范围

- 范围：
  1. **GUI e2e 栈**：`tauri-driver` + WebdriverIO（Tauri 官方 e2e 路径）或 Playwright 接 webview，实测**键入到上屏 p99** + **冷 / 热启动**。
  2. **CI 门禁**：新建 `.github/workflows`，跑 `pnpm check` + e2e 性能用例；指标回退即红。Linux runner 配 `xvfb` + WebKitGTK。
  3. **修门禁脚本**：把 `pnpm test` / `pnpm rs:test` 纳入 `pnpm check`（当前缺失，所谓「全量门禁」名不副实）。
  4. **对比 demo / 基线**：键入延迟 + 冷启动对比 Zed / VS Code（手测基线起步即可），正面回应「觉得重」。
- 非范围（明确不做）：全量帧时剖析、120fps 冲刺优化、大文件（100MB）门禁（先守键入 + 冷启动，大文件随 0017 验收补）、多平台矩阵（先单平台跑通，发行版矩阵留 M6）。

### 方案大纲

- e2e 目录 `e2e/`：启动 release 包 → 注入定量输入（如连续键入 N 字符）→ 采集帧 / 输入到绘制时间 → 多次取 p99。
- 冷/热启动：测进程启动到首帧可交互（呼应准则 #5「首帧画出可编辑文本」）。
- 阈值取自 design-system B 节：键入 p99 < 16ms、冷启动 < 300ms（先记录现状基线，门禁阈值可先宽后紧，但**只能收紧不能放松**）。
- demo 产物（数字 + 录屏）落 `docs/` 或 PROGRESS，作对外营销资产。

### 涉及文件

- `.github/workflows/ci.yml`（新）—— check + e2e 性能门禁
- `e2e/`（新）—— 性能测量用例 + harness
- `package.json` —— `check` 纳入 test/rs:test；新增 `test:e2e` / `perf` 脚本；新增 e2e devDeps
- `src-tauri/` —— 如需，加最小测量埋点（不得进打字热路径）
- `docs/progress/PROGRESS.md` —— 回填首次实测数字

### 验证计划

- [ ] 本地能稳定跑出键入 p99 + 冷/热启动数字（多次，取 p99）
- [ ] CI 绿；指标人为劣化时门禁能红（反向验证门禁有效）
- [ ] `pnpm check` 已含 test / rs:test
- [ ] 拿到对比 Zed / VS Code 的基线数字

### 风险与对策

- headless 测 GUI 依赖 xvfb + WebKitGTK（Linux 碎片化 = 调研头号风险）→ 先在单一可控发行版跑通，再谈矩阵。
- 测量噪声大 → 固定输入、预热、多次取 p99，记录方差。
- 这是独立工程、有自身周期 → **不挂在 0017（MD）的车上**；尺子须先于 0017 就位（哪怕只测「键入 100 字符 p99」的粗糙版）。

---

## Outcome（地基部分 · 2026-06-03）

### 实际改动（已完成：测试 + CI 地基）
- **首批单测**：`src/utils/path.test.ts`（8 例）、`src/utils/storage.test.ts`（5 例，含「缺/坏 JSON」两态 + 写失败仅 warn），内存版 localStorage mock，零新依赖（vitest 已在 devDeps）。
- **门禁补全**：`package.json` `check` 纳入 `pnpm test` 与 `pnpm rs:test`，闭合审查发现的「check 不跑测试」缺口。
- **CI**：新建 `.github/workflows/ci.yml`——ubuntu + pnpm + Node 22 + Rust + Tauri WebKitGTK 系统依赖 + rust-cache，跑 `pnpm check`（含全部子项）+ `pnpm build` + `pnpm perf:budget`。
- **首屏体积预算门禁**：新建 `scripts/check-bundle-budget.mjs` + `perf:budget` 脚本——解析 dist/index.html 的首屏 JS、gzip 求和与预算（170KB）比对；把「靠人眼看 vite >500KB 警告」换成自动门禁（红队点名的脆弱防线）。懒加载块自动排除。

### 验证结果
- ✅ `pnpm test`：13/13 通过（2 文件）。
- ✅ 完整 `pnpm check` 端到端全绿：typecheck / lint(--max-warnings=0) / format:check / **test(13)** / rs:fmt / rs:clippy(0 warning) / **rs:test(0 例 ok)**。
- ✅ `pnpm build && pnpm perf:budget` 实跑：首屏 JS gzip **127.1KB / 预算 170KB**，通过（单 chunk，懒加载块已排除）。
- ✅ 本会话**真跑 `pnpm tauri:dev`**：app 编译（bin 1.16s）+ 启动 + 运行无崩溃（`core:window:allow-destroy` 运行期有效）；Playwright 连 :1420 验证空态（E）与焦点环（A）。
- ⏳ **CI yml 未在此执行**：无法在本环境跑 GitHub Actions；其步骤对齐已验证全绿的 `pnpm check` + `perf:budget`，push 后生效（首次需确认 Linux WebKitGTK 依赖名随发行版无偏差）。

### 遗留问题（0016 核心未完：性能数字）
- **键入延迟 p99 + 冷/热启动实测**：未做——需真实显示环境（headless 测不了 GUI 延迟）。要搭 `tauri-driver` + WebdriverIO（或 Playwright 接 webview）e2e harness 采集指标，并定门禁阈值（design-system B 节）。
- **对比 Zed / VS Code 基线 demo**：未做，同样需显示环境。

### 下一步
- 在有显示的环境（本地 / 带 GUI 的 CI runner + xvfb）搭 e2e 性能 harness，实测键入 p99 + 冷启动，落为门禁阈值（只收紧不放松）。
- 阈值与首测数字回填 PROGRESS。
