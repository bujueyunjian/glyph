import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { listDir } from "@/api/workspaceApi";
import type { DirEntry } from "@/types/fsTypes";
import { getFileName } from "@/utils/path";
import { FileTreeNode, type FileTreeActions } from "./FileTreeNode";

interface FileTreeProps {
  rootPath: string;
  activePath?: string;
  onOpenFile: (path: string) => void;
  actions: FileTreeActions;
}

// 文件树侧栏:以 rootPath 为根列出顶层,子级由 FileTreeNode 懒展开。
export function FileTree({
  rootPath,
  activePath,
  onOpenFile,
  actions,
}: FileTreeProps) {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<DirEntry[] | null>(null);

  useEffect(() => {
    let active = true;
    listDir(rootPath)
      .then((list) => {
        if (active) setEntries(list);
      })
      .catch((err) => {
        toast.error(t("explorer.readFailed", { msg: (err as Error).message }));
      });
    return () => {
      active = false;
    };
  }, [rootPath, t]);

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 truncate px-3 py-2 text-xs font-medium tracking-wide text-[var(--color-subtle)] uppercase">
        {getFileName(rootPath)}
      </div>
      <div className="min-h-0 flex-1 overflow-auto pb-2">
        {entries?.map((entry) => (
          <FileTreeNode
            key={entry.path}
            entry={entry}
            depth={0}
            activePath={activePath}
            onOpenFile={onOpenFile}
            actions={actions}
          />
        ))}
      </div>
    </div>
  );
}
