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

// Live Preview 隐藏的语法标记节点(Lezer markdown 的分隔符)。隐藏后正文"所见即美",
// 但**光标所在行始终显示原始标记**(可正常编辑),即 Obsidian 式 Live Preview 取向。
const CONCEAL_NODES = new Set([
  "HeaderMark",
  "EmphasisMark",
  "CodeMark",
  "StrikethroughMark",
  "QuoteMark",
  "LinkMark",
]);

const CONCEAL = Decoration.replace({});

// 收集选区涉及的所有行号(含跨行选区的每一行):这些行显示原始标记,不隐藏。
export function selectionLines(state: EditorState): Set<number> {
  const lines = new Set<number>();
  for (const range of state.selection.ranges) {
    const first = state.doc.lineAt(range.from).number;
    const last = state.doc.lineAt(range.to).number;
    for (let line = first; line <= last; line += 1) lines.add(line);
  }
  return lines;
}

// 在可见区内,把不在光标行的语法标记节点替换隐藏(O(viewport),守延迟红线)。
export function buildConcealDecorations(
  state: EditorState,
  ranges: readonly { from: number; to: number }[],
  cursorLines: Set<number>,
): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  for (const { from, to } of ranges) {
    syntaxTree(state).iterate({
      from,
      to,
      enter: (node) => {
        if (!CONCEAL_NODES.has(node.name) || node.to <= node.from) return;
        // 光标所在行显示原始标记,便于编辑(Live Preview 核心交互)。
        if (cursorLines.has(state.doc.lineAt(node.from).number)) return;
        decorations.push(CONCEAL.range(node.from, node.to));
      },
    });
  }
  return Decoration.set(decorations, true);
}

// Live Preview 隐藏标记插件:文档/视口/光标变化时按可见区与光标行重建。
export const markdownConceal = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildConcealDecorations(
        view.state,
        view.visibleRanges,
        selectionLines(view.state),
      );
    }

    update(update: ViewUpdate) {
      // 含 selectionSet:光标移动需重算哪行显示原始标记。
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = buildConcealDecorations(
          update.view.state,
          update.view.visibleRanges,
          selectionLines(update.view.state),
        );
      }
    }
  },
  { decorations: (plugin) => plugin.decorations },
);
