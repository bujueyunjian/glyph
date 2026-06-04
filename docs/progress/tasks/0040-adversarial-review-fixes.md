# 任务 0040:对抗式多智能体审查 + 21 个真 bug 修复

- 状态:✅ 全部修复并过 `pnpm check`(72 前端测试 + 17 Rust + 2 e2e)+ build/budget;逐批推送 main
- 里程碑:质量加固 · 负责人:Claude · 开工/收工:2026-06-04

## Why
本程连续盲做 12 增量(0023–0039),大多"编译/CI 验过、运行时行为未验"。继续堆功能前,对这批代码做**对抗式深审**(多智能体并行审 5 维度 + 逐条独立核查),抓真实 bug。

## 审查(workflow)
5 维度并行审(分屏 / agent 流式 / LSP / MD 装饰 / 会话与实用命令)→ 每条发现派独立 skeptic 读源码核查是否真 bug。**提出 27 条,确认 21 条真 bug**(6 条误报被驳回)。32 个子智能体,~112 万 token。

## 修复(5 批,逐批 check + 推送)
**MD 装饰(默认开的 Live Preview,用户可见)**
- selectionLines 与可见区求交 → O(viewport),不再因全选/大选退化 O(doc)(守延迟红线)
- conceal/style 插件 update 加 treeChanged:语言包懒加载 reconfigure 后补建装饰(此前隐藏标记直到首次交互才出现)
- 跨段边界节点去重;选区末行 off-by-one 不再误揭示下一行

**分屏数据丢失(critical,根因:同文件双面板分叉)**
- getContent 按"最近编辑面板"取实例(handleDocChange 记录 pane)→ 保存写最新编辑
- 拆分屏(toggle/Ctrl+W)前把分屏编辑写回主面板实例,不再静默丢失
- openInFocused 仅成功后 setSplitPath;另存为后同步 splitPath / last-edited → 消除悬空空写
- 会话光标快照纳入分屏实例

**agent 流式(critical)**
- AgentRegistry + agent_cancel:子进程可终止回收,不再累积孤儿
- 事件带 turnId + 前端按当前 turn 过滤 + 常驻监听:旧会话不串扰、无监听泄漏/竞态、关闭后不复活对话框
- stderr 收集并入错误(失败响亮)+ 排空防阻塞

**LSP**
- 握手前排空 stderr 防管道阻塞;route_response 先查 method 防服务器请求撞号误投;读线程退出自清理(移除+kill+wait);lsp_stop 补 wait 回收僵尸

**小修**
- countText CJK 逐字;toggleWrap 不再误剥 "*a* *b*";最近文件/夹损坏时真清空(文案不再撒谎)

## 验证
- ✅ 每批 `pnpm check` 全绿;新增/加固单测覆盖各修复点(MD +3、textops +3、LSP route +1)。
- ✅ LSP 2 个 e2e(对真实 rust-analyzer 握手/completion)仍通过。
- ✅ build + budget 首屏始终达标。
- ⏳ GUI 行为(分屏/agent/live preview 的实际操作)仍待显示环境最终手验,但数据丢失/资源泄漏/竞态的根因已按逻辑修复并单测。

## 已知遗留(非本次审查范围)
- 分屏同文件"交替编辑两面板"的真分叉为 last-write-wins(单文件单脏标的固有取舍),已由"最近编辑面板"消除最常见的丢最新编辑;真正双向合并不做。
