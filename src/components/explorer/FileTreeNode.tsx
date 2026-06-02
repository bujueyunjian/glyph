import { useState } from "react";
import { ChevronDown, ChevronRight, File, Folder } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { listDir } from "@/api/workspaceApi";
import type { DirEntry } from "@/types/fsTypes";

interface FileTreeNodeProps {
  entry: DirEntry;
  depth: number;
  activePath?: string;
  onOpenFile: (path: string) => void;
}

// 文件树单个节点(递归)。目录懒展开(首次展开才读子级);文件点击即打开。
export function FileTreeNode({
  entry,
  depth,
  activePath,
  onOpenFile,
}: FileTreeNodeProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<DirEntry[] | null>(null);

  const handleClick = async () => {
    if (!entry.isDir) {
      onOpenFile(entry.path);
      return;
    }
    const next = !expanded;
    setExpanded(next);
    if (next && children === null) {
      try {
        setChildren(await listDir(entry.path));
      } catch (err) {
        // 失败响亮:弹红 toast,不静默兜底。
        toast.error(t("explorer.readFailed", { msg: (err as Error).message }));
      }
    }
  };

  const isActive = !entry.isDir && entry.path === activePath;

  return (
    <div>
      <button
        type="button"
        title={entry.name}
        onClick={handleClick}
        className={`flex w-full items-center gap-1 py-1 pr-2 text-left text-sm ${
          isActive
            ? "bg-[var(--color-overlay)] text-[var(--color-text)]"
            : "text-[var(--color-muted)] hover:bg-[var(--color-overlay)] hover:text-[var(--color-text)]"
        }`}
        style={{ paddingLeft: depth * 12 + 8 }}
      >
        {entry.isDir ? (
          expanded ? (
            <ChevronDown className="size-3.5 shrink-0" />
          ) : (
            <ChevronRight className="size-3.5 shrink-0" />
          )
        ) : (
          <span className="inline-block size-3.5 shrink-0" />
        )}
        {entry.isDir ? (
          <Folder className="size-3.5 shrink-0 text-[var(--color-accent)]" />
        ) : (
          <File className="size-3.5 shrink-0" />
        )}
        <span className="truncate">{entry.name}</span>
      </button>
      {entry.isDir && expanded && children
        ? children.map((child) => (
            <FileTreeNode
              key={child.path}
              entry={child}
              depth={depth + 1}
              activePath={activePath}
              onOpenFile={onOpenFile}
            />
          ))
        : null}
    </div>
  );
}
