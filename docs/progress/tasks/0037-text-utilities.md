# 任务 0037：实用命令——字数统计 + JSON 美化/压缩

- 状态：✅ 落地并过 `pnpm check`（8 单测）+ build/budget
- 里程碑：M2 可日用 / 文本力量 · 负责人：Claude · 开工/收工：2026-06-04

## Why
两个高频实用动作:写作时看**字数**(写作级 MD 辅助),处理 JSON 时**一键美化/压缩**。都是纯文本变换,适合做成命令面板动词。

## How
- **纯函数 + 单测**:
  - `textStats.countText(text)` → `{words, chars, lines}`(空白归一,空文本 0 字 1 行)。
  - `json.formatJson/minifyJson`:`JSON.parse`+`stringify`;**坏 JSON 直接抛错**,由命令层转红 toast,绝不静默兜底(no-fallback)。
- **App 接线**:
  - `showWordCount`:对聚焦文件全文计数,toast 展示(按需,不进打字热路径)。
  - `transformWholeDoc(fn, errorKey)`:替换全文,转换抛错则红 toast(不改文档)——JSON 命令复用。
  - 命令:字数统计(任意文件)、格式化/压缩 JSON(**仅 json/jsonc 文件进面板**)。
- 双语 i18n `textops.wordCount*` / `json.*`。

## 验证
- ✅ 8 单测(countText 4 + json 4,含坏 JSON 抛错);`pnpm check` 全绿(66 测试)。
- ✅ build + budget 首屏在预算内(纯函数 + dispatch,零首屏增量)。
- ⏳ GUI(命令执行 + 坏 JSON 红 toast)待显示自验。
