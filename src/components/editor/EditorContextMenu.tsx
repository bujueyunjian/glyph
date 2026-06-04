import { type ReactNode } from "react";
import * as ContextMenu from "@radix-ui/react-context-menu";
import { useTranslation } from "react-i18next";

interface EditorContextMenuProps {
  /** 语言服务器是否就绪:决定转到定义/查找引用/重命名/格式化是否出现。 */
  lspReady: boolean;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onFind: () => void;
  onGoToDefinition: () => void;
  onFindReferences: () => void;
  onRename: () => void;
  onFormat: () => void;
  onCommandPalette: () => void;
  children: ReactNode;
}

const contentClass =
  "z-50 min-w-[220px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-lg";
const itemClass =
  "flex cursor-default items-center justify-between gap-6 rounded px-2 py-1.5 text-sm text-[var(--color-text)] outline-none data-[highlighted]:bg-[var(--color-overlay)] data-[disabled]:opacity-40";
const shortcutClass = "text-xs text-[var(--color-subtle)]";
const separatorClass = "my-1 h-px bg-[var(--color-border)]";

// 编辑器右键上下文菜单:把面向选区/光标的操作放到约定俗成的右键里(剪贴板 + 查找 +
// LSP 导航/重构 + 命令面板)。LSP 项仅在语言服务器就绪时出现,保持菜单克制。
export function EditorContextMenu({
  lspReady,
  onCut,
  onCopy,
  onPaste,
  onFind,
  onGoToDefinition,
  onFindReferences,
  onRename,
  onFormat,
  onCommandPalette,
  children,
}: EditorContextMenuProps) {
  const { t } = useTranslation();
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className={contentClass}>
          <ContextMenu.Item className={itemClass} onSelect={onCut}>
            {t("edit.cut")}
            <span className={shortcutClass}>Ctrl/⌘ X</span>
          </ContextMenu.Item>
          <ContextMenu.Item className={itemClass} onSelect={onCopy}>
            {t("edit.copy")}
            <span className={shortcutClass}>Ctrl/⌘ C</span>
          </ContextMenu.Item>
          <ContextMenu.Item className={itemClass} onSelect={onPaste}>
            {t("edit.paste")}
            <span className={shortcutClass}>Ctrl/⌘ V</span>
          </ContextMenu.Item>

          <ContextMenu.Separator className={separatorClass} />
          <ContextMenu.Item className={itemClass} onSelect={onFind}>
            {t("edit.find")}
            <span className={shortcutClass}>Ctrl/⌘ F</span>
          </ContextMenu.Item>

          {lspReady ? (
            <>
              <ContextMenu.Separator className={separatorClass} />
              <ContextMenu.Item
                className={itemClass}
                onSelect={onGoToDefinition}
              >
                {t("lsp.goToDefinition")}
                <span className={shortcutClass}>F12</span>
              </ContextMenu.Item>
              <ContextMenu.Item
                className={itemClass}
                onSelect={onFindReferences}
              >
                {t("lsp.findReferences")}
              </ContextMenu.Item>
              <ContextMenu.Item className={itemClass} onSelect={onRename}>
                {t("lsp.rename")}
              </ContextMenu.Item>
              <ContextMenu.Item className={itemClass} onSelect={onFormat}>
                {t("lsp.format")}
              </ContextMenu.Item>
            </>
          ) : null}

          <ContextMenu.Separator className={separatorClass} />
          <ContextMenu.Item className={itemClass} onSelect={onCommandPalette}>
            {t("command.title")}
            <span className={shortcutClass}>Ctrl/⌘ ⇧ P</span>
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
