# 任务 0007：扩充语法高亮语言覆盖

- 状态：✅ 完成
- 里程碑：M1 · 负责人：Claude · 开工/收工：2026-06-02
- 缘起：用户打开 `.sql` 无高亮。根因：`languageRegistry` 只登记 8 类，未含 SQL，落到纯文本分支。

## Plan / Outcome（小任务合并）
落实「开箱即用」(turnkey)：不只补 SQL，一次补齐常见语言。**全部懒加载**，对启动体积零影响。

### 改动
- 新增依赖：`@codemirror/lang-{sql,yaml,xml,java,cpp,go,php,vue,sass,less}` + `@codemirror/legacy-modes`。
- 重写 `languageRegistry.ts`：
  - 官方 Lezer：js/jsx/ts/tsx/mjs/cjs/json/jsonc/rs/md/css/html/htm/py/pyw/**sql**/yaml/yml/xml/svg/java/c/h/cpp/cc/cxx/hpp/hh/go/php/vue/scss/sass/less。
  - legacy-modes（StreamLanguage）：sh/bash/zsh/toml/ini/conf/dockerfile/lua/rb/pl/swift/r/jl/clj/hs/ps1/cmake。

### 验证
- `pnpm build` ✅（所有语言 import 解析成功）；**初始入口仍 366KB/gzip 117KB 不变**（新语言全是按需 chunk）。
- `pnpm lint` / `format` ✅。

### 遗留
- 未覆盖的扩展名仍回退纯文本（可继续登记）。
- tree-sitter 替换 Lezer 留 M2。
