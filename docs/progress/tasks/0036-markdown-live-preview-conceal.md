# 任务 0036：Markdown Live Preview（Obsidian 式光标感知隐藏标记）

- 状态：🚧 逻辑落地并过 `pnpm check`（8 单测含 4 conceal）；视觉观感待显示自验
- 里程碑：M3 支柱② · 负责人：Claude · 模式：盲做（逻辑单测 + 设置作安全阀）
- 开工/收工：2026-06-04

> 承接 [0031] 行内着重渲染,补齐 ADR-0002 的核心交互:**非光标行隐藏语法标记**(`**`/`#`/`` ` ``/`>` 等),正文呈现"所见即美";**光标移到该行立即显示原始标记**可编辑。这是 Obsidian Live Preview 的精髓,也是写作级 MD 护城河②的关键体验。

## Why
0031 让 md 结构着重(粗体显粗),但 `**`/`#` 仍在,视觉仍"源码味"。Live Preview 要在不打断编辑的前提下把标记藏起来——而"不打断"靠**光标行始终显示原始标记**实现。

## How
- **`buildConcealDecorations(state, ranges, cursorLines)`**(纯函数,可单测):遍历可见区,对分隔符节点(HeaderMark/EmphasisMark/CodeMark/StrikethroughMark/QuoteMark/LinkMark)加 `Decoration.replace({})` 隐藏 —— **但跳过光标所在行**(`cursorLines`)。
- **`selectionLines(state)`**:收集选区涉及的全部行号(含跨行选区每一行)→ 这些行显示原始标记。
- **`markdownConceal` 插件**:`docChanged | viewportChanged | selectionSet` 时重建(光标移动即重算哪行揭示);O(viewport) 守延迟红线。
- **设置安全阀**:`settings.markdownLivePreview`(默认开)。CodeEditor 仅对 md 且开启时挂插件;不喜可在设置关闭(尊重用户,虽我们引领默认)。
- 双语 i18n `settings.markdownLivePreview`。

## 验证
- ✅ 4 conceal 单测:非光标行隐藏标记、**光标行不隐藏(可编辑)**、多行仅隐藏非光标行、纯文本无隐藏。**核心交互逻辑坐实**。
- ✅ `pnpm check` 全绿(58 测试);build + budget 首屏在预算内(随懒加载编辑器 chunk,不进首屏)。
- ⏳ 实际观感(隐藏/揭示是否顺滑、与 0031 样式叠加是否美)待显示环境肉眼验。replace 装饰为行内、仅 md、光标行恒显原文 → 风险有界(编辑行永不被遮)。

## 已知边界
- 隐藏 `# ` 后标题有一个前导空格(HeaderMark 仅含 `#`);链接隐藏 `[]()` 后仅余文本+目标分离,复杂链接观感待调。
- 代码块(FencedCode)整体不隐藏围栏(仅行内码标记);表格未特殊处理。
- 视觉细节(字号层次/隐藏过渡)留显示环境微调;逻辑层已稳。
