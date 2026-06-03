import * as Menubar from "@radix-ui/react-menubar";
import { Check, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import type { Theme } from "@/theme/themes";
import { getFileName } from "@/utils/path";

interface MenuBarProps {
  // 文件
  onOpen: () => void;
  onOpenFolder: () => void;
  recentFiles: string[];
  onOpenRecent: (path: string) => void;
  onClearRecent: () => void;
  recentFolders: string[];
  onOpenRecentFolder: (path: string) => void;
  onClearRecentFolders: () => void;
  hasFolder: boolean;
  onCloseFolder: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  canSave: boolean;
  // 编辑(需有激活编辑器,用 canSave 代理)
  onUndo: () => void;
  onRedo: () => void;
  onFind: () => void;
  // 视图
  sidebarVisible: boolean;
  onToggleSidebar: () => void;
  onOpenSettings: () => void;
  themes: Theme[];
  activeThemeId: string;
  onThemeChange: (id: string) => void;
  // 帮助
  appVersion?: string;
}

const triggerClass =
  "rounded px-2 py-0.5 text-sm text-[var(--color-muted)] outline-none data-[state=open]:bg-[var(--color-overlay)] data-[state=open]:text-[var(--color-text)] hover:text-[var(--color-text)]";
const contentClass =
  "z-50 min-w-[220px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-lg";
const itemClass =
  "flex cursor-default items-center justify-between gap-6 rounded px-2 py-1.5 text-sm text-[var(--color-text)] outline-none data-[highlighted]:bg-[var(--color-overlay)] data-[disabled]:opacity-40";
const shortcutClass = "text-xs text-[var(--color-subtle)]";
const separatorClass = "my-1 h-px bg-[var(--color-border)]";

// 左上角应用菜单栏:文件 / 编辑 / 视图 / 帮助。菜单项内联显示快捷键(自我教学)。
// 基于 Radix Menubar,键盘可达(无障碍)。
export function MenuBar(props: MenuBarProps) {
  const { t } = useTranslation();
  const {
    onOpen,
    onOpenFolder,
    recentFiles,
    onOpenRecent,
    onClearRecent,
    recentFolders,
    onOpenRecentFolder,
    onClearRecentFolders,
    hasFolder,
    onCloseFolder,
    onSave,
    onSaveAs,
    canSave,
    onUndo,
    onRedo,
    onFind,
    sidebarVisible,
    onToggleSidebar,
    onOpenSettings,
    themes,
    activeThemeId,
    onThemeChange,
    appVersion,
  } = props;

  return (
    <Menubar.Root className="flex items-center gap-0.5">
      {/* 文件 */}
      <Menubar.Menu>
        <Menubar.Trigger className={triggerClass}>
          {t("menu.file")}
        </Menubar.Trigger>
        <Menubar.Portal>
          <Menubar.Content
            className={contentClass}
            align="start"
            sideOffset={4}
          >
            <Menubar.Item className={itemClass} onSelect={onOpen}>
              {t("file.open")}
              <span className={shortcutClass}>Ctrl/⌘ O</span>
            </Menubar.Item>
            <Menubar.Item className={itemClass} onSelect={onOpenFolder}>
              {t("file.openFolder")}
            </Menubar.Item>

            <Menubar.Sub>
              <Menubar.SubTrigger className={itemClass}>
                {t("file.recent")}
                <ChevronRight className="size-3.5" />
              </Menubar.SubTrigger>
              <Menubar.Portal>
                <Menubar.SubContent className={contentClass} sideOffset={2}>
                  {recentFiles.length === 0 ? (
                    <Menubar.Item className={itemClass} disabled>
                      {t("file.recentEmpty")}
                    </Menubar.Item>
                  ) : (
                    recentFiles.map((path) => (
                      <Menubar.Item
                        key={path}
                        className={itemClass}
                        title={path}
                        onSelect={() => onOpenRecent(path)}
                      >
                        <span className="max-w-[220px] truncate">
                          {getFileName(path)}
                        </span>
                      </Menubar.Item>
                    ))
                  )}
                  {recentFiles.length > 0 ? (
                    <>
                      <Menubar.Separator className={separatorClass} />
                      <Menubar.Item
                        className={itemClass}
                        onSelect={onClearRecent}
                      >
                        {t("file.clearRecent")}
                      </Menubar.Item>
                    </>
                  ) : null}
                </Menubar.SubContent>
              </Menubar.Portal>
            </Menubar.Sub>

            <Menubar.Sub>
              <Menubar.SubTrigger className={itemClass}>
                {t("file.recentFolders")}
                <ChevronRight className="size-3.5" />
              </Menubar.SubTrigger>
              <Menubar.Portal>
                <Menubar.SubContent className={contentClass} sideOffset={2}>
                  {recentFolders.length === 0 ? (
                    <Menubar.Item className={itemClass} disabled>
                      {t("file.recentEmpty")}
                    </Menubar.Item>
                  ) : (
                    recentFolders.map((path) => (
                      <Menubar.Item
                        key={path}
                        className={itemClass}
                        title={path}
                        onSelect={() => onOpenRecentFolder(path)}
                      >
                        <span className="max-w-[220px] truncate">
                          {getFileName(path)}
                        </span>
                      </Menubar.Item>
                    ))
                  )}
                  {recentFolders.length > 0 ? (
                    <>
                      <Menubar.Separator className={separatorClass} />
                      <Menubar.Item
                        className={itemClass}
                        onSelect={onClearRecentFolders}
                      >
                        {t("file.clearRecent")}
                      </Menubar.Item>
                    </>
                  ) : null}
                </Menubar.SubContent>
              </Menubar.Portal>
            </Menubar.Sub>

            <Menubar.Separator className={separatorClass} />
            <Menubar.Item
              className={itemClass}
              disabled={!hasFolder}
              onSelect={onCloseFolder}
            >
              {t("file.closeFolder")}
            </Menubar.Item>

            <Menubar.Separator className={separatorClass} />
            <Menubar.Item
              className={itemClass}
              disabled={!canSave}
              onSelect={onSave}
            >
              {t("file.save")}
              <span className={shortcutClass}>Ctrl/⌘ S</span>
            </Menubar.Item>
            <Menubar.Item
              className={itemClass}
              disabled={!canSave}
              onSelect={onSaveAs}
            >
              {t("file.saveAs")}
              <span className={shortcutClass}>Ctrl/⌘ ⇧ S</span>
            </Menubar.Item>
          </Menubar.Content>
        </Menubar.Portal>
      </Menubar.Menu>

      {/* 编辑 */}
      <Menubar.Menu>
        <Menubar.Trigger className={triggerClass}>
          {t("menu.edit")}
        </Menubar.Trigger>
        <Menubar.Portal>
          <Menubar.Content
            className={contentClass}
            align="start"
            sideOffset={4}
          >
            <Menubar.Item
              className={itemClass}
              disabled={!canSave}
              onSelect={onUndo}
            >
              {t("edit.undo")}
              <span className={shortcutClass}>Ctrl/⌘ Z</span>
            </Menubar.Item>
            <Menubar.Item
              className={itemClass}
              disabled={!canSave}
              onSelect={onRedo}
            >
              {t("edit.redo")}
              <span className={shortcutClass}>Ctrl/⌘ ⇧ Z</span>
            </Menubar.Item>
            <Menubar.Separator className={separatorClass} />
            <Menubar.Item
              className={itemClass}
              disabled={!canSave}
              onSelect={onFind}
            >
              {t("edit.find")}
              <span className={shortcutClass}>Ctrl/⌘ F</span>
            </Menubar.Item>
          </Menubar.Content>
        </Menubar.Portal>
      </Menubar.Menu>

      {/* 视图 */}
      <Menubar.Menu>
        <Menubar.Trigger className={triggerClass}>
          {t("menu.view")}
        </Menubar.Trigger>
        <Menubar.Portal>
          <Menubar.Content
            className={contentClass}
            align="start"
            sideOffset={4}
          >
            <Menubar.Item className={itemClass} onSelect={onToggleSidebar}>
              {sidebarVisible ? t("view.hideSidebar") : t("view.showSidebar")}
              <span className={shortcutClass}>Ctrl/⌘ B</span>
            </Menubar.Item>
            <Menubar.Item className={itemClass} onSelect={onOpenSettings}>
              {t("settings.title")}
              <span className={shortcutClass}>Ctrl/⌘ ,</span>
            </Menubar.Item>
            <Menubar.Separator className={separatorClass} />
            <Menubar.Label className="px-2 py-1 text-xs text-[var(--color-subtle)]">
              {t("menu.theme")}
            </Menubar.Label>
            <Menubar.RadioGroup
              value={activeThemeId}
              onValueChange={onThemeChange}
            >
              {themes.map((theme) => (
                <Menubar.RadioItem
                  key={theme.id}
                  value={theme.id}
                  className={itemClass}
                >
                  {theme.label}
                  <Menubar.ItemIndicator>
                    <Check className="size-3.5 text-[var(--color-accent)]" />
                  </Menubar.ItemIndicator>
                </Menubar.RadioItem>
              ))}
            </Menubar.RadioGroup>
          </Menubar.Content>
        </Menubar.Portal>
      </Menubar.Menu>

      {/* 帮助 */}
      <Menubar.Menu>
        <Menubar.Trigger className={triggerClass}>
          {t("menu.help")}
        </Menubar.Trigger>
        <Menubar.Portal>
          <Menubar.Content
            className={contentClass}
            align="start"
            sideOffset={4}
          >
            <Menubar.Item
              className={itemClass}
              onSelect={() =>
                toast.success(`${t("app.name")} v${appVersion ?? "0.0.1"}`)
              }
            >
              {t("help.about")}
              <span className={shortcutClass}>v{appVersion ?? "0.0.1"}</span>
            </Menubar.Item>
          </Menubar.Content>
        </Menubar.Portal>
      </Menubar.Menu>
    </Menubar.Root>
  );
}
