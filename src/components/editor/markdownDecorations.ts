import type { EditorState, Range } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";

// Lezer markdown 节点名 → 行内样式类(覆盖 commonmark + GFM 常见节点)。
// 只用 **mark 装饰**(给区间加 class,不改文本、不替换、不隐藏标记),故绝不影响
// 编辑/选择/撤销 —— 行内"所见即美"的最小安全实现(差异化支柱②)。视觉在 styles.css。
const NODE_CLASS: Record<string, string> = {
  ATXHeading1: "cm-md-h1",
  ATXHeading2: "cm-md-h2",
  ATXHeading3: "cm-md-h3",
  ATXHeading4: "cm-md-h",
  ATXHeading5: "cm-md-h",
  ATXHeading6: "cm-md-h",
  SetextHeading1: "cm-md-h1",
  SetextHeading2: "cm-md-h2",
  StrongEmphasis: "cm-md-strong",
  Emphasis: "cm-md-em",
  Strikethrough: "cm-md-strike",
  InlineCode: "cm-md-code",
  Link: "cm-md-link",
  Blockquote: "cm-md-quote",
};

const MARKS: Record<string, Decoration> = Object.fromEntries(
  Object.entries(NODE_CLASS).map(([name, cls]) => [
    name,
    Decoration.mark({ class: cls }),
  ]),
);

// 仅遍历传入范围(调用方传 view.visibleRanges)→ O(viewport) 而非 O(doc),
// 守"延迟即产品"红线:每键只处理可见区,不扫全文。
export function buildMarkdownDecorations(
  state: EditorState,
  ranges: readonly { from: number; to: number }[],
): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  for (const { from, to } of ranges) {
    syntaxTree(state).iterate({
      from,
      to,
      enter: (node) => {
        const deco = MARKS[node.name];
        if (deco && node.to > node.from) {
          decorations.push(deco.range(node.from, node.to));
        }
      },
    });
  }
  // sort=true:节点嵌套(如标题含粗体)产生重叠区间,交给 RangeSet 排序去重。
  return Decoration.set(decorations, true);
}

// 行内 Markdown 样式插件:文档/视口变化时按可见区重建装饰。
export const markdownInlineStyle = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildMarkdownDecorations(
        view.state,
        view.visibleRanges,
      );
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildMarkdownDecorations(
          update.view.state,
          update.view.visibleRanges,
        );
      }
    }
  },
  { decorations: (plugin) => plugin.decorations },
);
