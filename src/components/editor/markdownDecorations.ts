import type { EditorState, Range } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
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
        // 跨段边界的节点会被相邻两段各 enter 一次;只在节点起点所在段处理,去重。
        if (node.from < from) return;
        const deco = MARKS[node.name];
        if (deco && node.to > node.from) {
          decorations.push(deco.range(node.from, node.to));
        }
      },
    });
  }
  // sort=true:节点嵌套(如标题含粗体)产生重叠区间,交给 RangeSet 排序。
  return Decoration.set(decorations, true);
}

// 语法树是否变化:覆盖语言包懒加载后的 reconfigure 与增量解析完成。
// 缺它则:挂载初期语言未就绪 → 构造空装饰,语言到位(reconfigure)时本插件实例
// 被复用只走 update(),而 doc/viewport/selection 均未变 → 装饰永不重建(标记不隐藏/不着色)。
function treeChanged(update: ViewUpdate): boolean {
  return syntaxTree(update.startState) !== syntaxTree(update.state);
}

// 行内 Markdown 样式插件:文档/视口/语法树变化时按可见区重建装饰。
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
      if (update.docChanged || update.viewportChanged || treeChanged(update)) {
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

class TaskCheckboxWidget extends WidgetType {
  constructor(
    private readonly from: number,
    private readonly to: number,
    private readonly checked: boolean,
  ) {
    super();
  }

  eq(other: TaskCheckboxWidget) {
    return (
      this.from === other.from &&
      this.to === other.to &&
      this.checked === other.checked
    );
  }

  toDOM(view: EditorView) {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.className = "cm-md-task-checkbox";
    input.checked = this.checked;
    input.ariaLabel = this.checked
      ? "Mark task as incomplete"
      : "Mark task as complete";
    input.addEventListener("change", () => {
      view.dispatch({
        changes: {
          from: this.from,
          to: this.to,
          insert: this.checked ? "[ ]" : "[x]",
        },
      });
    });
    return input;
  }

  ignoreEvent() {
    return false;
  }
}

interface MarkdownImage {
  alt: string;
  url: string;
}

export function parseMarkdownImage(source: string): MarkdownImage | null {
  const match = /^!\[([^\]]*)\]\((.*)\)$/.exec(source.trim());
  if (!match) return null;
  const url = match[2].trim().replace(/^<|>$/g, "");
  if (!url) return null;
  return { alt: match[1], url };
}

function canPreviewImageUrl(url: string): boolean {
  return /^(https?:|data:image\/|blob:)/i.test(url);
}

class ImagePreviewWidget extends WidgetType {
  constructor(private readonly image: MarkdownImage) {
    super();
  }

  eq(other: ImagePreviewWidget) {
    return (
      this.image.alt === other.image.alt && this.image.url === other.image.url
    );
  }

  toDOM() {
    const card = document.createElement("span");
    card.className = "cm-md-image-card";

    if (canPreviewImageUrl(this.image.url)) {
      const img = document.createElement("img");
      img.className = "cm-md-image";
      img.src = this.image.url;
      img.alt = this.image.alt;
      card.appendChild(img);
    } else {
      const placeholder = document.createElement("span");
      placeholder.className = "cm-md-image-placeholder";
      placeholder.textContent = "Image";
      card.appendChild(placeholder);
    }

    const caption = document.createElement("span");
    caption.className = "cm-md-image-caption";
    caption.textContent = this.image.alt || this.image.url;
    card.appendChild(caption);
    return card;
  }
}

// 收集"光标/选区所在、且落在可见区内"的行号——这些行显示原始标记,不隐藏。
// 关键:与 ranges(可见区)求交,只物化视口内的行 → O(viewport),不因大选区/全选退化成 O(doc)。
export function selectionLines(
  state: EditorState,
  ranges: readonly { from: number; to: number }[],
): Set<number> {
  const lines = new Set<number>();
  for (const sel of state.selection.ranges) {
    const first = state.doc.lineAt(sel.from).number;
    // 末行 off-by-one:选区尾恰落在下一行行首(只多选了换行符)时不波及下一行。
    const lastPos = sel.to > sel.from ? sel.to - 1 : sel.to;
    const last = state.doc.lineAt(lastPos).number;
    for (const view of ranges) {
      const lo = Math.max(first, state.doc.lineAt(view.from).number);
      const hi = Math.min(last, state.doc.lineAt(view.to).number);
      for (let line = lo; line <= hi; line += 1) lines.add(line);
    }
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
        // 跨段边界节点只在起点所在段处理,避免相邻两段各推一条重复 replace。
        if (node.from < from || node.to <= node.from) return;
        const lineNumber = state.doc.lineAt(node.from).number;
        if (node.name === "TaskMarker") {
          const marker = state.doc.sliceString(node.from, node.to);
          decorations.push(
            Decoration.replace({
              widget: new TaskCheckboxWidget(
                node.from,
                node.to,
                /x/i.test(marker),
              ),
            }).range(node.from, node.to),
          );
          return;
        }
        if (node.name === "Image" && !cursorLines.has(lineNumber)) {
          const image = parseMarkdownImage(
            state.doc.sliceString(node.from, node.to),
          );
          if (image) {
            decorations.push(
              Decoration.replace({
                widget: new ImagePreviewWidget(image),
              }).range(node.from, node.to),
            );
            return false;
          }
        }
        // 链接里的 URL 也隐藏(只留链接文本,Obsidian 式);但仅限 [文本](url) 形式,
        // 不碰正文里的裸链接(parent 非 Link)。其余按 CONCEAL_NODES 判定。
        const conceal =
          node.name === "URL"
            ? node.node.parent?.name === "Link"
            : CONCEAL_NODES.has(node.name);
        if (!conceal) return;
        // 光标所在行显示原始标记,便于编辑(Live Preview 核心交互)。
        if (cursorLines.has(lineNumber)) return;
        decorations.push(CONCEAL.range(node.from, node.to));
      },
    });
  }
  return Decoration.set(decorations, true);
}

// Live Preview 隐藏标记插件:文档/视口/光标/语法树变化时按可见区与光标行重建。
export const markdownConceal = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildConcealDecorations(
        view.state,
        view.visibleRanges,
        selectionLines(view.state, view.visibleRanges),
      );
    }

    update(update: ViewUpdate) {
      // selectionSet:光标移动需重算揭示行;treeChanged:语言懒加载就绪后补建隐藏。
      if (
        update.docChanged ||
        update.viewportChanged ||
        update.selectionSet ||
        treeChanged(update)
      ) {
        this.decorations = buildConcealDecorations(
          update.view.state,
          update.view.visibleRanges,
          selectionLines(update.view.state, update.view.visibleRanges),
        );
      }
    }
  },
  { decorations: (plugin) => plugin.decorations },
);
