import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { listFiles } from "@/api/workspaceApi";
import { lspRequest } from "@/api/lspApi";
import { flattenSymbols, type DocSymbol } from "@/features/lsp/protocol";
import type { WorkspaceFile } from "@/types/fsTypes";
import { getFileName } from "@/utils/path";

interface QuickOpenProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 当前工作区根;为空则只支持 `:` 跳行(无文件可搜)。 */
  rootPath: string | null;
  /** LSP 服务器 id + 当前文件 uri;有则支持 `@` 跳符号。 */
  lspServerId?: number;
  activeUri?: string;
  onOpenFile: (path: string) => void;
  onGoToLine: (line: number) => void;
}

// Goto Anything:"一个栏去任何地方"。默认模糊查找工作区文件;
// `:` 跳行;`@` 跳符号(LSP documentSymbol)。复用命令面板的 cmdk 样式。
export function QuickOpen({
  open,
  onOpenChange,
  rootPath,
  lspServerId,
  activeUri,
  onOpenFile,
  onGoToLine,
}: QuickOpenProps) {
  const { t } = useTranslation();
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [symbols, setSymbols] = useState<DocSymbol[]>([]);
  const [search, setSearch] = useState("");

  // 每次打开时重置查询并(有文件夹则)拉取文件索引 +(有 LSP 则)拉取文档符号。
  useEffect(() => {
    if (!open) return;
    setSearch("");
    setSymbols([]);
    let active = true;
    if (rootPath) {
      listFiles(rootPath)
        .then((list) => {
          if (active) setFiles(list);
        })
        .catch((err) => {
          toast.error(
            t("explorer.readFailed", { msg: (err as Error).message }),
          );
        });
    } else {
      setFiles([]);
    }
    if (lspServerId != null && activeUri) {
      lspRequest(lspServerId, "textDocument/documentSymbol", {
        textDocument: { uri: activeUri },
      })
        .then((res) => {
          if (active) setSymbols(flattenSymbols(res));
        })
        .catch(() => {
          /* 无符号能力/失败:`@` 模式空,静默 */
        });
    }
    return () => {
      active = false;
    };
  }, [open, rootPath, lspServerId, activeUri, t]);

  const goLineMode = search.startsWith(":");
  const symbolMode = search.startsWith("@");
  const lineNumber = goLineMode ? Number.parseInt(search.slice(1), 10) : NaN;
  const lineValid = Number.isFinite(lineNumber) && lineNumber > 0;
  const symbolQuery = symbolMode ? search.slice(1).toLowerCase() : "";
  const matchedSymbols = symbolMode
    ? symbols.filter((s) => s.name.toLowerCase().includes(symbolQuery))
    : [];

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label={t("quickOpen.title")}
      shouldFilter={!goLineMode && !symbolMode}
    >
      <Command.Input
        value={search}
        onValueChange={setSearch}
        placeholder={t("quickOpen.placeholder")}
      />
      <Command.List>
        {symbolMode ? (
          matchedSymbols.length > 0 ? (
            matchedSymbols.map((sym, i) => (
              <Command.Item
                key={`${sym.name}-${sym.line}-${i}`}
                value={`${sym.name}-${sym.line}-${i}`}
                onSelect={() => {
                  onOpenChange(false);
                  onGoToLine(sym.line + 1);
                }}
              >
                <span className="truncate">{sym.name}</span>
                <span className="ml-3 text-xs text-[var(--color-subtle)]">
                  {sym.line + 1}
                </span>
              </Command.Item>
            ))
          ) : (
            <Command.Empty>{t("quickOpen.symbolEmpty")}</Command.Empty>
          )
        ) : goLineMode ? (
          lineValid ? (
            <Command.Item
              value="goto-line"
              onSelect={() => {
                onOpenChange(false);
                onGoToLine(lineNumber);
              }}
            >
              {t("quickOpen.goToLine", { line: lineNumber })}
            </Command.Item>
          ) : (
            <Command.Empty>{t("quickOpen.lineHint")}</Command.Empty>
          )
        ) : (
          <>
            <Command.Empty>{t("quickOpen.empty")}</Command.Empty>
            {files.map((file) => (
              <Command.Item
                key={file.path}
                value={file.relativePath}
                onSelect={() => {
                  onOpenChange(false);
                  onOpenFile(file.path);
                }}
              >
                <span className="truncate">{getFileName(file.path)}</span>
                <span className="ml-3 truncate text-xs text-[var(--color-subtle)]">
                  {file.relativePath}
                </span>
              </Command.Item>
            ))}
          </>
        )}
      </Command.List>
    </Command.Dialog>
  );
}
