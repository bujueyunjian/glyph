import { forwardRef, useEffect, useMemo, useState } from "react";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { vscodeDark, vscodeLight } from "@uiw/codemirror-theme-vscode";
import { EditorState, type Extension } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { indentUnit } from "@codemirror/language";
import { search, searchKeymap } from "@codemirror/search";

import type { ThemeKind } from "@/theme/themes";
import type { EditorSettings } from "@/types/settingsTypes";
import { loadLanguageExtension } from "./languageRegistry";

interface CodeEditorProps {
  /** 初始内容(仅挂载时取一次);文档之后由 CodeMirror 自己持有。 */
  initialValue: string;
  /** 文件扩展名(小写,不含点),用于异步加载语法高亮。 */
  extension: string;
  /** 跟随应用主题的明暗。 */
  themeKind: ThemeKind;
  /** 用户偏好(字号/Tab/缩进/换行/行号/连字),改即实时重配置。 */
  settings: EditorSettings;
  /** 用户编辑时回调(只用于标脏,不回流文档内容)。 */
  onDocChange: () => void;
}

// CodeMirror 6 编辑器(纯展示)。关键:**不把文档内容回流到 React state**——
// value 只作初始值(配合 App 用 key=path 重挂载),编辑只走 CodeMirror 内部,
// onChange 仅触发标脏。保存时由上层经 ref 读 view.state.doc。这样按键不再
// 每次穿过 React 渲染,是"手感轻"的关键(北极星:用户体验高于一切)。
// 语言包按需异步加载;search 提供 Ctrl/Cmd+F;settings 实时驱动字号/缩进/换行等。
export const CodeEditor = forwardRef<ReactCodeMirrorRef, CodeEditorProps>(
  function CodeEditor(
    { initialValue, extension, themeKind, settings, onDocChange },
    ref,
  ) {
    const [languageExt, setLanguageExt] = useState<Extension[]>([]);

    useEffect(() => {
      let active = true;
      void loadLanguageExtension(extension).then((ext) => {
        if (active) setLanguageExt(ext);
      });
      return () => {
        active = false;
      };
    }, [extension]);

    // 设置实时驱动:字号/连字、Tab 宽度、缩进(空格 vs Tab)、自动换行。
    const extensions = useMemo(() => {
      const appearance = EditorView.theme({
        "&": { fontSize: `${settings.fontSize}px` },
        ".cm-content": {
          fontVariantLigatures: settings.ligatures ? "normal" : "none",
        },
      });
      const indent = settings.insertSpaces
        ? " ".repeat(settings.tabSize)
        : "\t";
      return [
        appearance,
        EditorState.tabSize.of(settings.tabSize),
        indentUnit.of(indent),
        ...(settings.wordWrap ? [EditorView.lineWrapping] : []),
        search({ top: true }),
        keymap.of(searchKeymap),
        ...languageExt,
      ];
    }, [languageExt, settings]);

    // 行号开关走 basicSetup(与默认项合并,其余特性不变)。
    const basicSetup = useMemo(
      () => ({ lineNumbers: settings.lineNumbers }),
      [settings.lineNumbers],
    );

    return (
      <CodeMirror
        ref={ref}
        value={initialValue}
        height="100%"
        theme={themeKind === "light" ? vscodeLight : vscodeDark}
        basicSetup={basicSetup}
        extensions={extensions}
        onChange={onDocChange}
        className="h-full w-full"
      />
    );
  },
);
