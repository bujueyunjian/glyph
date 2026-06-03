import { useState } from "react";
import { ChevronDown, ChevronRight, File, Folder } from "lucide-react";
import * as ContextMenu from "@radix-ui/react-context-menu";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { listDir } from "@/api/workspaceApi";
import type { DirEntry } from "@/types/fsTypes";

// 文件树右键操作回调(由 App 实现:弹输入/确认 + 调命令 + 刷新)。
export interface FileTreeActions {
  onCreate: (parentDir: string, isDir: boolean) => void;
  onRename: (path: string, name: string) => void;
  onDelete: (path: string, name: string) => void;
}

interface FileTreeNodeProps {
  entry: DirEntry;
  depth: number;
  activePath?: string;
  onOpenFile: (path: string) => void;
  actions: FileTreeActions;
}

const menuItemClass =
  "cursor-default rounded px-2 py-1 text-sm text-[var(--color-text)] outline-none select-none data-[highlighted]:bg-[var(--color-overlay)]";

// 文件树单个节点(递归)。目录懒展开;文件点击即打开;右键弹增删改菜单。
export function FileTreeNode({
  entry,
  depth,
  activePath,
  onOpenFile,
  actions,
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
        toast.error(t("explorer.readFailed", { msg: (err as Error).message }));
      }
    }
  };

  const isActive = !entry.isDir && entry.path === activePath;

  return (
    <div>
      <ContextMenu.Root>
        <ContextMenu.Trigger asChild>
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
        </ContextMenu.Trigger>
        <ContextMenu.Portal>
          <ContextMenu.Content className="z-50 min-w-[160px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-xl">
            {entry.isDir ? (
              <>
                <ContextMenu.Item
                  className={menuItemClass}
                  onSelect={() => actions.onCreate(entry.path, false)}
                >
                  {t("explorer.newFile")}
                </ContextMenu.Item>
                <ContextMenu.Item
                  className={menuItemClass}
                  onSelect={() => actions.onCreate(entry.path, true)}
                >
                  {t("explorer.newFolder")}
                </ContextMenu.Item>
                <ContextMenu.Separator className="my-1 h-px bg-[var(--color-border)]" />
              </>
            ) : null}
            <ContextMenu.Item
              className={menuItemClass}
              onSelect={() => actions.onRename(entry.path, entry.name)}
            >
              {t("explorer.rename")}
            </ContextMenu.Item>
            <ContextMenu.Item
              className={menuItemClass}
              onSelect={() => actions.onDelete(entry.path, entry.name)}
            >
              {t("explorer.delete")}
            </ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu.Portal>
      </ContextMenu.Root>
      {entry.isDir && expanded && children
        ? children.map((child) => (
            <FileTreeNode
              key={child.path}
              entry={child}
              depth={depth + 1}
              activePath={activePath}
              onOpenFile={onOpenFile}
              actions={actions}
            />
          ))
        : null}
    </div>
  );
}
