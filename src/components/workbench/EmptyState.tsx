import { useTranslation } from "react-i18next";

import logoUrl from "@/assets/logo.svg";

// 空态:安静的快捷键速查表,不营销(设计准则 #5「显示内容,不显示转圈」;空态即自我教学)。
const SHORTCUTS = [
  { labelKey: "file.open", keys: "Ctrl/⌘ O" },
  { labelKey: "command.title", keys: "Ctrl/⌘ ⇧ P" },
  { labelKey: "quickOpen.title", keys: "Ctrl/⌘ P" },
  { labelKey: "settings.title", keys: "Ctrl/⌘ ," },
] as const;

export function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 text-center select-none">
      <img src={logoUrl} alt="Glyph" className="size-16 opacity-95" />
      <div className="text-lg text-[var(--color-text)]">
        {t("workbench.emptyTitle")}
      </div>
      <ul className="flex w-60 flex-col gap-2 text-sm">
        {SHORTCUTS.map((item) => (
          <li
            key={item.labelKey}
            className="flex items-center justify-between gap-6"
          >
            <span className="text-[var(--color-muted)]">
              {t(item.labelKey)}
            </span>
            <kbd className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 font-mono text-xs text-[var(--color-subtle)]">
              {item.keys}
            </kbd>
          </li>
        ))}
      </ul>
    </div>
  );
}
