import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { searchFiles } from "@/api/searchApi";
import type { SearchHit } from "@/types/searchTypes";

interface SearchPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rootPath?: string | null;
  onOpenHit: (path: string, line: number) => void;
}

// 跨文件搜索面板(Ctrl/⌘+Shift+F)。防抖调用 Rust 搜索后端,点击命中跳转到文件行。
export function SearchPanel({
  open,
  onOpenChange,
  rootPath,
  onOpenHit,
}: SearchPanelProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);

  // 关闭时清空,下次打开干净。
  useEffect(() => {
    if (!open) {
      setQuery("");
      setHits([]);
    }
  }, [open]);

  // 防抖搜索:query / caseSensitive 变更 250ms 后执行。
  useEffect(() => {
    if (!open || !rootPath || query.trim() === "") {
      setHits([]);
      return;
    }
    const id = setTimeout(() => {
      setSearching(true);
      searchFiles(rootPath, query, caseSensitive)
        .then(setHits)
        .catch((err) =>
          toast.error(t("search.failed", { msg: (err as Error).message })),
        )
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(id);
  }, [open, rootPath, query, caseSensitive, t]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45" />
        <Dialog.Content className="fixed top-[12%] left-1/2 z-50 flex max-h-[70vh] w-[640px] max-w-[92vw] -translate-x-1/2 flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl">
          <Dialog.Title className="sr-only">{t("search.title")}</Dialog.Title>
          <Dialog.Description className="sr-only">
            {t("search.title")}
          </Dialog.Description>
          <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3">
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("search.placeholder")}
              className="flex-1 bg-transparent text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-subtle)]"
            />
            <label className="flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
              <input
                type="checkbox"
                className="size-3.5 accent-[var(--color-accent)]"
                checked={caseSensitive}
                onChange={(event) => setCaseSensitive(event.target.checked)}
              />
              {t("search.caseSensitive")}
            </label>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-2">
            {!rootPath ? (
              <div className="p-4 text-center text-sm text-[var(--color-muted)]">
                {t("search.noFolder")}
              </div>
            ) : query.trim() === "" ? null : searching ? (
              <div className="p-4 text-center text-sm text-[var(--color-muted)]">
                {t("search.searching")}
              </div>
            ) : hits.length === 0 ? (
              <div className="p-4 text-center text-sm text-[var(--color-muted)]">
                {t("search.empty")}
              </div>
            ) : (
              <>
                <div className="px-2 py-1 text-xs text-[var(--color-subtle)]">
                  {t("search.count", { count: hits.length })}
                </div>
                {hits.map((hit, index) => (
                  <button
                    key={`${hit.path}:${hit.line}:${hit.column}:${index}`}
                    type="button"
                    onClick={() => {
                      onOpenHit(hit.path, hit.line);
                      onOpenChange(false);
                    }}
                    className="flex w-full items-baseline gap-2 rounded px-2 py-1 text-left hover:bg-[var(--color-overlay)]"
                  >
                    <span className="shrink-0 text-xs text-[var(--color-subtle)]">
                      {hit.relativePath}:{hit.line}
                    </span>
                    <span className="truncate font-mono text-xs text-[var(--color-muted)]">
                      {hit.lineText.trim()}
                    </span>
                  </button>
                ))}
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
