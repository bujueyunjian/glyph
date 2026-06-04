import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { OutlineSymbol } from "@/features/lsp/protocol";

interface OutlinePanelProps {
  symbols: OutlineSymbol[];
  /** 是否正在拉取符号。 */
  loading: boolean;
  /** 大纲来源是否可用(Markdown 恒真;其余语言需 LSP 就绪)。否则空态提示需语言服务器。 */
  canResolve: boolean;
  /** 跳转到 0 基行(调用方转 1 基)。 */
  onGoToLine: (line: number) => void;
  onClose: () => void;
}

// LSP SymbolKind → 简短标签(影响行尾的类型提示),未知留空。
const KIND_LABEL: Record<number, string> = {
  2: "mod",
  3: "ns",
  5: "class",
  6: "method",
  7: "prop",
  8: "field",
  9: "ctor",
  10: "enum",
  11: "iface",
  12: "fn",
  13: "var",
  14: "const",
  22: "enum",
  23: "struct",
  24: "event",
  26: "type",
};

// 文档大纲侧栏:列出当前文件的符号(LSP documentSymbol),按层级缩进,点击跳转到对应行。
// 复用已测的 outlineSymbols 映射;符号需语言服务器,未就绪时给提示而非空态。
export function OutlinePanel({
  symbols,
  loading,
  canResolve,
  onGoToLine,
  onClose,
}: OutlinePanelProps) {
  const { t } = useTranslation();
  return (
    <div className="flex h-full w-[260px] shrink-0 flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-2">
        <span className="text-sm font-medium text-[var(--color-text)]">
          {t("outline.title")}
        </span>
        <button
          type="button"
          className="rounded p-1 text-[var(--color-muted)] hover:bg-[var(--color-overlay)] hover:text-[var(--color-text)]"
          onClick={onClose}
          aria-label={t("common.cancel")}
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto py-1">
        {loading ? (
          <p className="px-3 py-2 text-xs text-[var(--color-subtle)]">
            {t("outline.loading")}
          </p>
        ) : symbols.length === 0 ? (
          <p className="px-3 py-2 text-xs text-[var(--color-subtle)]">
            {canResolve ? t("outline.empty") : t("outline.needsLsp")}
          </p>
        ) : (
          symbols.map((sym, index) => (
            <button
              key={`${sym.name}:${sym.line}:${index}`}
              type="button"
              onClick={() => onGoToLine(sym.line)}
              title={sym.name}
              className="flex w-full items-baseline gap-2 px-3 py-1 text-left hover:bg-[var(--color-overlay)]"
              style={{ paddingLeft: `${12 + sym.depth * 14}px` }}
            >
              <span className="truncate text-sm text-[var(--color-text)]">
                {sym.name}
              </span>
              {sym.kind != null && KIND_LABEL[sym.kind] ? (
                <span className="ml-auto shrink-0 text-[10px] text-[var(--color-subtle)]">
                  {KIND_LABEL[sym.kind]}
                </span>
              ) : null}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
