# 任务 0012：编辑器内查找/替换（Ctrl/Cmd+F）

- 状态：✅ 完成（编译/门禁层）· GUI 待用户自验
- 里程碑：M1 · 关联任务：#12 · 负责人：Claude · 开工/收工：2026-06-02

## Plan / Outcome（小任务合并）

### 目标
日常最高频的编辑能力:查找/替换。用 `@codemirror/search`(久经验证)接入,Ctrl/Cmd+F 打开面板。

### 改动
- 新增依赖 `@codemirror/search`。
- `CodeEditor`:extensions 加 `search({ top: true })` + `keymap.of(searchKeymap)`(置顶面板 + 保证 Ctrl/Cmd+F 唤起;@uiw basicSetup 已含匹配高亮)。memoize 避免重配置。
- 全在懒加载的 CodeEditor chunk 内,**不影响首屏**;面板随编辑器主题(vscodeDark/Light)明暗。

### 能力(开箱即得)
查找 / 替换 / 替换全部 / 正则 / 大小写 / 全词 / 匹配计数 / 上一处下一处 / 选区内。

### 验证
- [x] build / lint / format / tsc ✅ 全绿;无 >500KB 警告(search 在懒加载 chunk)
- [ ] GUI:Ctrl/Cmd+F 打开、查找替换、Esc 关闭(用户自验;**dev 需重启拾取新依赖** @codemirror/search)

### 非范围
- 跨文件全局查找替换(需 ripgrep 后端,后续)。
