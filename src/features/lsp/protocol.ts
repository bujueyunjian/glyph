import type { Text } from "@codemirror/state";

// LSP ↔ CodeMirror 之间的纯转换。位置换算、补全/诊断映射全在这里,可独立单测,
// 不依赖运行的服务器或 DOM —— 这是 LSP 接入编辑器最易错、也最该被测住的一层。

// LSP Position:0 基行 + UTF-16 列。CodeMirror:1 基行 + 字符偏移。
export interface LspPosition {
  line: number;
  character: number;
}

// CM 文档偏移 → LSP Position。character 为 UTF-16 码元数(JS 字符串天然 UTF-16)。
export function offsetToPosition(doc: Text, offset: number): LspPosition {
  const clamped = Math.max(0, Math.min(offset, doc.length));
  const line = doc.lineAt(clamped);
  return { line: line.number - 1, character: clamped - line.from };
}

// LSP Position → CM 文档偏移(行/列越界则钳到合法范围,避免坏位置炸事务)。
export function positionToOffset(doc: Text, position: LspPosition): number {
  const lineNo = Math.max(1, Math.min(position.line + 1, doc.lines));
  const line = doc.line(lineNo);
  const character = Math.max(0, Math.min(position.character, line.length));
  return line.from + character;
}

// LSP CompletionItemKind → CM 补全类型(影响图标/分组),未知归 "text"。
const KIND_TO_TYPE: Record<number, string> = {
  2: "method",
  3: "function",
  4: "function", // Constructor
  5: "property", // Field
  6: "variable",
  7: "class",
  8: "interface",
  9: "namespace", // Module
  10: "property",
  13: "enum",
  14: "keyword",
  21: "constant",
  22: "type", // Struct
  25: "type", // TypeParameter
};

export interface CmCompletion {
  label: string;
  type?: string;
  detail?: string;
}

// LSP completion 响应(CompletionList{items} 或 CompletionItem[] 或 null)→ CM 补全项。
export function toCmCompletions(result: unknown): CmCompletion[] {
  const items = Array.isArray(result)
    ? result
    : ((result as { items?: unknown[] } | null)?.items ?? []);
  const out: CmCompletion[] = [];
  for (const raw of items) {
    const item = raw as {
      label?: unknown;
      kind?: unknown;
      detail?: unknown;
    };
    if (typeof item.label !== "string") continue;
    const completion: CmCompletion = { label: item.label };
    if (typeof item.kind === "number" && KIND_TO_TYPE[item.kind]) {
      completion.type = KIND_TO_TYPE[item.kind];
    }
    if (typeof item.detail === "string") completion.detail = item.detail;
    out.push(completion);
  }
  return out;
}

// LSP Hover.contents(string | MarkedString | MarkupContent | 其数组)→ 纯文本。
export function hoverText(result: unknown): string | null {
  const contents = (result as { contents?: unknown } | null)?.contents;
  if (contents == null) return null;
  const one = (c: unknown): string => {
    if (typeof c === "string") return c;
    const value = (c as { value?: unknown })?.value;
    return typeof value === "string" ? value : "";
  };
  const text = Array.isArray(contents)
    ? contents.map(one).filter(Boolean).join("\n\n")
    : one(contents);
  return text.trim() || null;
}

export interface CmChange {
  from: number;
  to: number;
  insert: string;
}

// LSP TextEdit[](formatting/rename 返回)→ CM changes(range 换算到偏移)。
// TextEdit 互不重叠(LSP 保证),故按原文偏移一次性 dispatch 即可。
export function toCmChanges(edits: unknown, doc: Text): CmChange[] {
  if (!Array.isArray(edits)) return [];
  const out: CmChange[] = [];
  for (const raw of edits) {
    const e = raw as {
      range?: { start?: LspPosition; end?: LspPosition };
      newText?: unknown;
    };
    if (!e.range?.start || !e.range?.end || typeof e.newText !== "string") {
      continue;
    }
    out.push({
      from: positionToOffset(doc, e.range.start),
      to: positionToOffset(doc, e.range.end),
      insert: e.newText,
    });
  }
  return out;
}

export interface RefHit {
  path: string;
  relativePath: string;
  line: number;
  column: number;
  lineText: string;
}

// LSP references(Location[])→ 搜索结果面板可用的命中项(行/列转 1 基;无行文本)。
export function referencesToHits(
  result: unknown,
  rootPath: string | null,
): RefHit[] {
  if (!Array.isArray(result)) return [];
  const out: RefHit[] = [];
  for (const raw of result) {
    const loc = raw as { uri?: unknown; range?: { start?: LspPosition } };
    if (typeof loc.uri !== "string" || !loc.range?.start) continue;
    const path = loc.uri.startsWith("file://")
      ? decodeURIComponent(loc.uri.slice("file://".length))
      : loc.uri;
    const relativePath =
      rootPath && path.startsWith(rootPath)
        ? path.slice(rootPath.length).replace(/^\//, "")
        : path;
    out.push({
      path,
      relativePath,
      line: loc.range.start.line + 1,
      column: loc.range.start.character + 1,
      lineText: "",
    });
  }
  return out;
}

export interface DocSymbol {
  name: string;
  line: number;
  kind?: number;
}

// LSP documentSymbol 响应 → 扁平符号列表(兼容层级 DocumentSymbol[] 与扁平 SymbolInformation[])。
export function flattenSymbols(result: unknown): DocSymbol[] {
  if (!Array.isArray(result)) return [];
  const out: DocSymbol[] = [];
  const visit = (nodes: unknown[]) => {
    for (const raw of nodes) {
      const n = raw as {
        name?: unknown;
        kind?: unknown;
        range?: { start?: LspPosition };
        selectionRange?: { start?: LspPosition };
        location?: { range?: { start?: LspPosition } };
        children?: unknown;
      };
      const start =
        n.selectionRange?.start ?? n.range?.start ?? n.location?.range?.start;
      if (typeof n.name === "string" && start) {
        out.push({
          name: n.name,
          line: start.line,
          kind: typeof n.kind === "number" ? n.kind : undefined,
        });
      }
      if (Array.isArray(n.children)) visit(n.children);
    }
  };
  visit(result);
  return out;
}

export interface FileEdits {
  path: string;
  edits: unknown[];
}

const uriToPath = (uri: string): string =>
  uri.startsWith("file://")
    ? decodeURIComponent(uri.slice("file://".length))
    : uri;

// LSP WorkspaceEdit(rename 返回)→ 按文件分组的 TextEdit。兼容 changes 映射与 documentChanges 数组。
export function workspaceEditChanges(result: unknown): FileEdits[] {
  if (!result || typeof result !== "object") return [];
  const we = result as {
    changes?: Record<string, unknown[]>;
    documentChanges?: unknown[];
  };
  const out: FileEdits[] = [];
  if (we.changes && typeof we.changes === "object") {
    for (const [uri, edits] of Object.entries(we.changes)) {
      if (Array.isArray(edits)) out.push({ path: uriToPath(uri), edits });
    }
  }
  if (Array.isArray(we.documentChanges)) {
    for (const dc of we.documentChanges) {
      const d = dc as { textDocument?: { uri?: unknown }; edits?: unknown };
      if (typeof d.textDocument?.uri === "string" && Array.isArray(d.edits)) {
        out.push({ path: uriToPath(d.textDocument.uri), edits: d.edits });
      }
    }
  }
  return out;
}

export interface DefinitionTarget {
  path: string;
  line: number;
  character: number;
}

// LSP definition 响应 → 目标文件 + 位置。兼容 Location / LocationLink / 其数组,取第一个。
export function definitionTarget(result: unknown): DefinitionTarget | null {
  const loc = Array.isArray(result) ? result[0] : result;
  if (!loc || typeof loc !== "object") return null;
  const l = loc as {
    uri?: unknown;
    targetUri?: unknown;
    range?: { start?: LspPosition };
    targetSelectionRange?: { start?: LspPosition };
    targetRange?: { start?: LspPosition };
  };
  const uri =
    typeof l.uri === "string"
      ? l.uri
      : typeof l.targetUri === "string"
        ? l.targetUri
        : null;
  const start =
    l.range?.start ?? l.targetSelectionRange?.start ?? l.targetRange?.start;
  if (!uri || !start) return null;
  const path = uri.startsWith("file://")
    ? decodeURIComponent(uri.slice("file://".length))
    : uri;
  return { path, line: start.line, character: start.character };
}

export type CmSeverity = "error" | "warning" | "info" | "hint";

export interface CmDiagnostic {
  from: number;
  to: number;
  severity: CmSeverity;
  message: string;
}

// LSP DiagnosticSeverity(1=Error..4=Hint)→ CM severity。
const SEVERITY: Record<number, CmSeverity> = {
  1: "error",
  2: "warning",
  3: "info",
  4: "hint",
};

// LSP publishDiagnostics 的 diagnostics 数组 → CM lint 诊断(范围换算到文档偏移)。
export function toCmDiagnostics(
  diagnostics: unknown,
  doc: Text,
): CmDiagnostic[] {
  if (!Array.isArray(diagnostics)) return [];
  const out: CmDiagnostic[] = [];
  for (const raw of diagnostics) {
    const d = raw as {
      range?: { start?: LspPosition; end?: LspPosition };
      severity?: unknown;
      message?: unknown;
    };
    if (!d.range?.start || !d.range?.end || typeof d.message !== "string") {
      continue;
    }
    const from = positionToOffset(doc, d.range.start);
    const to = positionToOffset(doc, d.range.end);
    out.push({
      from,
      to: Math.max(from, to),
      severity:
        typeof d.severity === "number"
          ? (SEVERITY[d.severity] ?? "error")
          : "error",
      message: d.message,
    });
  }
  return out;
}
