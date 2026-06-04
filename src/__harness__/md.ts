import { EditorView, keymap } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { defaultKeymap } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import {
  markdownConceal,
  markdownInlineStyle,
} from "@/components/editor/markdownDecorations";
import "@/styles.css";

const sample = `# Glyph 写作级 Markdown

普通段落,带 **粗体**、*斜体*、~~删除线~~ 和 \`行内代码\`。

## 二级标题

### 三级标题

> 引用块:所见即美,克制不喧宾夺主。

- 列表项一
- 列表项二

1. 有序一
2. 有序二

[链接文本](https://example.com) 与正文混排。
`;

new EditorView({
  state: EditorState.create({
    doc: sample,
    extensions: [
      keymap.of(defaultKeymap),
      markdown({ base: markdownLanguage }),
      markdownInlineStyle,
      markdownConceal,
      vscodeDark,
      EditorView.theme({ "&": { height: "100vh", fontSize: "15px" } }),
    ],
  }),
  parent: document.getElementById("app")!,
});
