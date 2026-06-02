import { X } from "lucide-react";

import type { EditorTab } from "@/hooks/useEditorTabs";
import { getFileName } from "@/utils/path";

interface TabBarProps {
  tabs: EditorTab[];
  activePath: string | null;
  onActivate: (path: string) => void;
  onClose: (path: string) => void;
}

// 标签栏。脏标记显示为小圆点,hover 时变为关闭按钮(克制:不抢视觉)。
export function TabBar({ tabs, activePath, onActivate, onClose }: TabBarProps) {
  return (
    <div className="flex h-9 shrink-0 items-stretch overflow-x-auto border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      {tabs.map((tab) => {
        const active = tab.path === activePath;
        return (
          <div
            key={tab.path}
            onClick={() => onActivate(tab.path)}
            className={`group flex cursor-default items-center gap-2 border-r border-[var(--color-border)] px-3 text-sm ${
              active
                ? "bg-[var(--color-bg)] text-[var(--color-text)]"
                : "text-[var(--color-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            <span className="max-w-[140px] truncate">
              {getFileName(tab.path)}
            </span>
            <span className="relative flex size-4 items-center justify-center">
              {tab.isDirty ? (
                <span className="size-1.5 rounded-full bg-current group-hover:hidden" />
              ) : null}
              <button
                type="button"
                aria-label="close"
                onClick={(event) => {
                  event.stopPropagation();
                  onClose(tab.path);
                }}
                className={`items-center justify-center rounded hover:bg-[var(--color-overlay)] ${
                  tab.isDirty ? "hidden group-hover:flex" : "flex"
                }`}
              >
                <X className="size-3.5" />
              </button>
            </span>
          </div>
        );
      })}
    </div>
  );
}
