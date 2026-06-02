import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { listFiles } from "@/api/workspaceApi";
import type { WorkspaceFile } from "@/types/fsTypes";
import { getFileName } from "@/utils/path";

interface QuickOpenProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 当前工作区根;为空则只支持 `:` 跳行(无文件可搜)。 */
  rootPath: string | null;
  onOpenFile: (path: string) => void;
  onGoToLine: (line: number) => void;
}

// Goto Anything:"一个栏去任何地方"。默认模糊查找工作区文件;
// 输入以 `:` 开头切跳行模式(跳当前文件)。复用命令面板的 cmdk 样式。
export function QuickOpen({
  open,
  onOpenChange,
  rootPath,
  onOpenFile,
  onGoToLine,
}: QuickOpenProps) {
  const { t } = useTranslation();
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [search, setSearch] = useState("");

  // 每次打开时重置查询并(有文件夹则)拉取文件索引。
  useEffect(() => {
    if (!open) return;
    setSearch("");
    if (!rootPath) {
      setFiles([]);
      return;
    }
    let active = true;
    listFiles(rootPath)
      .then((list) => {
        if (active) setFiles(list);
      })
      .catch((err) => {
        toast.error(t("explorer.readFailed", { msg: (err as Error).message }));
      });
    return () => {
      active = false;
    };
  }, [open, rootPath, t]);

  const goLineMode = search.startsWith(":");
  const lineNumber = goLineMode ? Number.parseInt(search.slice(1), 10) : NaN;
  const lineValid = Number.isFinite(lineNumber) && lineNumber > 0;

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label={t("quickOpen.title")}
      shouldFilter={!goLineMode}
    >
      <Command.Input
        value={search}
        onValueChange={setSearch}
        placeholder={t("quickOpen.placeholder")}
      />
      <Command.List>
        {goLineMode ? (
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
