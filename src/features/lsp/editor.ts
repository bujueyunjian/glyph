import {
  autocompletion,
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";
import { setDiagnostics } from "@codemirror/lint";
import type { Extension } from "@codemirror/state";
import {
  EditorView,
  hoverTooltip,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

import { lspRequest, lspSend } from "@/api/lspApi";
import {
  hoverText,
  offsetToPosition,
  toCmCompletions,
  toCmDiagnostics,
} from "./protocol";

// 把已验证的 LSP 后端接入 CodeMirror:补全源(textDocument/completion)+ 诊断波浪线
// (publishDiagnostics → lint)+ didOpen/didChange/didClose 生命周期。
// 位置换算/映射在 protocol.ts(已单测);本文件负责与 CM/事件的接线。
// 注:渲染(补全弹窗/波浪线)需显示环境肉眼验;数据正确性已由 protocol 单测 + 后端 e2e 覆盖。

export interface LspEditorContext {
  serverId: number;
  /** 文档 URI(file://...)。 */
  uri: string;
  /** LSP languageId(rust/typescript/...)。 */
  languageId: string;
}

function notification(method: string, params: unknown): string {
  return JSON.stringify({ jsonrpc: "2.0", method, params });
}

// 补全源:在标识符处或显式触发时,向服务器要补全并映射为 CM 选项。
function completionSource(ctx: LspEditorContext) {
  return async (
    context: CompletionContext,
  ): Promise<CompletionResult | null> => {
    const word = context.matchBefore(/[\w$]*/);
    if (!context.explicit && (!word || word.from === word.to)) return null;
    let result: unknown;
    try {
      result = await lspRequest(ctx.serverId, "textDocument/completion", {
        textDocument: { uri: ctx.uri },
        position: offsetToPosition(context.state.doc, context.pos),
      });
    } catch {
      return null; // 服务器错/超时:不打断打字
    }
    const items = toCmCompletions(result);
    if (items.length === 0) return null;
    return {
      from: word ? word.from : context.pos,
      options: items.map((item) => ({
        label: item.label,
        type: item.type,
        detail: item.detail,
      })),
    };
  };
}

// 同步插件:挂载 didOpen + 监听诊断;编辑防抖 didChange(全量同步);卸载 didClose。
function syncPlugin(ctx: LspEditorContext) {
  return ViewPlugin.fromClass(
    class {
      private unlisten?: UnlistenFn;
      private version = 1;
      private timer?: number;

      constructor(view: EditorView) {
        void lspSend(
          ctx.serverId,
          notification("textDocument/didOpen", {
            textDocument: {
              uri: ctx.uri,
              languageId: ctx.languageId,
              version: this.version,
              text: view.state.doc.toString(),
            },
          }),
        );
        void listen<{ id: number; message: string }>(
          "lsp://message",
          (event) => {
            if (event.payload.id !== ctx.serverId) return;
            let msg: {
              method?: string;
              params?: { uri?: string; diagnostics?: unknown };
            };
            try {
              msg = JSON.parse(event.payload.message);
            } catch {
              return;
            }
            if (msg.method !== "textDocument/publishDiagnostics") return;
            if (msg.params?.uri !== ctx.uri) return;
            const diagnostics = toCmDiagnostics(
              msg.params.diagnostics,
              view.state.doc,
            );
            view.dispatch(setDiagnostics(view.state, diagnostics));
          },
        ).then((un) => {
          this.unlisten = un;
        });
      }

      update(update: ViewUpdate) {
        if (!update.docChanged) return;
        this.version += 1;
        const version = this.version;
        const text = update.state.doc.toString();
        window.clearTimeout(this.timer);
        this.timer = window.setTimeout(() => {
          void lspSend(
            ctx.serverId,
            notification("textDocument/didChange", {
              textDocument: { uri: ctx.uri, version },
              contentChanges: [{ text }],
            }),
          );
        }, 300);
      }

      destroy() {
        window.clearTimeout(this.timer);
        this.unlisten?.();
        void lspSend(
          ctx.serverId,
          notification("textDocument/didClose", {
            textDocument: { uri: ctx.uri },
          }),
        );
      }
    },
  );
}

// 悬停提示:向服务器要 hover,渲染类型/文档(纯文本,防 XSS;Markdown 富渲染留后续)。
function lspHover(ctx: LspEditorContext) {
  return hoverTooltip(async (view, pos) => {
    let result: unknown;
    try {
      result = await lspRequest(ctx.serverId, "textDocument/hover", {
        textDocument: { uri: ctx.uri },
        position: offsetToPosition(view.state.doc, pos),
      });
    } catch {
      return null;
    }
    const text = hoverText(result);
    if (!text) return null;
    return {
      pos,
      create() {
        const dom = document.createElement("div");
        dom.className = "cm-lsp-hover";
        dom.textContent = text; // textContent 防注入
        return { dom };
      },
    };
  });
}

export function lspEditorExtensions(ctx: LspEditorContext): Extension {
  return [
    autocompletion({ override: [completionSource(ctx)] }),
    lspHover(ctx),
    syncPlugin(ctx),
  ];
}
