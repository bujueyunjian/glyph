# Glyph 命名规范

- 状态：✅ 生效（2026-06-02）
- 来源：取自 `specflow` skill 的 `standards/frontend.md` 与 `tech-stack-patterns.md` 的「见名知职责」纪律，**仅采纳命名规范本身**（不引入 specflow 的流程），并适配 Glyph 的 TypeScript + Rust 双语言栈。
- 总纲：**看文件名知职责、看函数名知行为、看变量名知含义；命名即文档。**

> 与 git-ai-studio 的差异：Glyph 的前端目录采用 specflow 结构（`src/api/`、`src/types/`、角色词后缀组件），而非 git-ai-studio 的 `src/lib/`。这是用户的显式要求。

---

## 1. 前端（TypeScript / React）

### 1.1 组件文件
- **PascalCase**，文件名 = 导出组件名。
- 禁止用 `index.tsx` 作业务组件入口（仅 barrel `index.ts` 可用）。
- **角色词后缀**（见名知职责）：

| 角色 | 后缀/前缀 | 示例 |
|---|---|---|
| 页面/主视图 | `Page` | `SettingsPage.tsx` |
| 布局 | `Layout` | `WorkbenchLayout.tsx` |
| 容器（含业务逻辑） | `Container` | `EditorContainer.tsx` |
| 展示（纯渲染） | 无特定后缀 | `StatusBar.tsx`、`EmptyState.tsx` |
| 弹窗 | `Dialog` / `Modal` | `CommandPalette` 例外按通用名 |
| 基础 UI | `Base` 前缀 | `BaseButton.tsx` |

- 禁止：`Comp1.tsx`、`New.tsx`、`Test.tsx`、`editor.tsx`（非 PascalCase）。

### 1.2 函数
- **Hooks**：`use` 前缀 + 名词职责：`useActiveFile()`、`useEditorState()`。
- **事件处理**：JSX 内回调用 `handle` 前缀（`handleSave`、`handleKeyDown`）；props 回调用 `on` 前缀（`onConfirm`、`onChange`）。
- **工具函数**：动词 + 对象，明确输入输出：`formatBytes()`、`detectLanguage()`、`parseFilePath()`。
- 禁止：`getData`、`doSomething`、`process`、`fn`、`func1`（无语义/过模糊）。明确叫 `openFile`、`getAppInfo`。

### 1.3 常量与枚举
- 常量：`UPPER_SNAKE_CASE`，按模块组织：`DEFAULT_TAB_SIZE`、`MAX_OPEN_FILES`、`LARGE_FILE_BYTES`。
- 枚举/映射：PascalCase 对象名 + `UPPER_SNAKE` 键（`as const`）：
  ```ts
  export const FileEncoding = { UTF8: "UTF8", UTF16LE: "UTF16LE" } as const;
  ```

### 1.4 类型
- 接口/类型用 PascalCase：`AppInfo`、`OpenFileResult`。
- 组件 props 用 `XxxProps`（`EditorContainerProps`）。
- **禁止 `any`**；复杂类型抽到 `src/types/`。

### 1.5 目录结构（按功能模块）
```
src/
├── api/                  Tauri IPC 封装层(禁止组件内直接 invoke)
│   ├── ipc.ts            统一 call<T>(),类比 axios request 实例
│   └── {模块}Api.ts      如 fileApi.ts(openFile/saveFile)
├── components/
│   ├── common/           基础 UI(Base 前缀)
│   ├── workbench/        外壳:WorkbenchLayout / StatusBar / EmptyState
│   └── editor/           编辑器:CodeEditor 等
├── constants/            常量与枚举(UPPER_SNAKE)
├── hooks/                use 前缀
├── i18n/                 多语言(见 §4)
├── types/                TS 类型(appTypes.ts 等)
├── utils/                工具函数(动词+对象)
├── App.tsx / main.tsx / styles.css
```
- 每个目录职责明确，**禁止 `other/`、`misc/`、`common2/`**。
- 业务组件就近放所属模块；被 ≥2 模块引用才提升到 `components/common`。

### 1.6 API 层
- 文件名 `{模块}Api.ts`；每个函数声明入参与返回类型。
- 命名 JS 侧用 camelCase（`openFile`），对应 Rust 命令可为 snake_case（`open_file`）。
- **禁止组件内直接 `invoke()`**——一律走 `api/` 封装（统一错误语义）。

### 1.7 CSS
- 默认 **Tailwind utility**（specflow 允许团队统一采用）。
- 必须写的自定义全局样式加业务前缀 `g-` / `glyph-`；组件内优先 CSS Module / scoped。
- 禁止 `.red`、`.ml10`、`.box1` 这类无语义类名。

## 2. 后端（Rust / Tauri）
- 遵循 **idiomatic Rust** 命名（clippy 强制），同时贯彻「见名知职责」：
  - 模块/文件/函数：`snake_case`，函数动词开头（`get_app_info`、`open_file`、`save_file`）。
  - 类型/枚举/trait：`PascalCase`（`AppInfo`、`OpenFileResult`）。
  - 常量：`UPPER_SNAKE_CASE`。
- **角色化模块**（对应 Java 职责命名精神）：`commands/`（命令入口）、`fs/`、`search/`、`lsp/`、`agent/`、`plugin/`；角色类型用 `XxxConverter` / `XxxRegistry` / `XxxWatcher` 等见名知职责的后缀。
- Tauri command 函数名即跨边界命令名；与前端 `api/` 封装一一对应。

## 3. 通用纪律（来自 specflow「见名知职责」）
- 角色类/模块名直接体现职责：`Converter` / `Validator` / `Factory` / `Registry` / `Watcher` / `Controller`(后端) 等。
- 禁止无业务语义的名字（`data`、`info`、`temp`、`util1`、`manager`(过泛)）。
- 缩写仅用公认词（`id`、`url`、`json`、`ast`、`lsp`、`mcp`、`acp`）。

## 4. 多语言（i18n，一期 zh-CN + en）
- 框架：i18next + react-i18next。
- **文案禁止硬编码**；全部走 `src/i18n/locales/{zh-CN,en}.json`，组件用 `useTranslation()` 取键。
- key 用**点分层级 + 语义化**：`workbench.emptyTitle`、`file.saveFailed`。禁止用整句中文当 key。
- 新增字符串**必须同时给 zh-CN + en**；en 要"自然 + 准确技术词",不直译。
- 架构支持后续加语种：新增 `locales/<lang>.json` + 在 `i18n/index.ts` 注册即可，不改业务代码。

## 5. 审查
- 代码审查对照本规范逐项检查命名与目录；新增组件需说明其角色词分类。
- 违反命名规范视为缺陷,与功能 bug 同等对待。
