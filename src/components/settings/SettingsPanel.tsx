import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { Theme } from "@/theme/themes";
import {
  type EditorSettings,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  TAB_SIZE_OPTIONS,
} from "@/types/settingsTypes";

interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: EditorSettings;
  updateSetting: <K extends keyof EditorSettings>(
    key: K,
    value: EditorSettings[K],
  ) => void;
  resetSettings: () => void;
  themes: Theme[];
  activeThemeId: string;
  onThemeChange: (id: string) => void;
}

// 设置行:左标签右控件。
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-sm text-[var(--color-text)]">{label}</span>
      {children}
    </div>
  );
}

const selectClass =
  "rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm text-[var(--color-text)] outline-none";

// 设置面板(Radix Dialog)。受控控件,改即存即用(useSettings 持久化),跟随主题明暗。
export function SettingsPanel({
  open,
  onOpenChange,
  settings,
  updateSetting,
  resetSettings,
  themes,
  activeThemeId,
  onThemeChange,
}: SettingsPanelProps) {
  const { t } = useTranslation();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[460px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
            <Dialog.Title className="text-sm font-medium text-[var(--color-text)]">
              {t("settings.title")}
            </Dialog.Title>
            <Dialog.Close
              className="rounded p-1 text-[var(--color-muted)] hover:bg-[var(--color-overlay)] hover:text-[var(--color-text)]"
              aria-label={t("settings.close")}
            >
              <X className="size-4" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">
            {t("settings.title")}
          </Dialog.Description>

          <div className="divide-y divide-[var(--color-border)] px-4 py-2">
            <Row label={t("settings.theme")}>
              <select
                className={selectClass}
                value={activeThemeId}
                onChange={(e) => onThemeChange(e.target.value)}
              >
                {themes.map((theme) => (
                  <option key={theme.id} value={theme.id}>
                    {theme.label}
                  </option>
                ))}
              </select>
            </Row>

            <Row label={t("settings.fontSize")}>
              <input
                type="number"
                className={`${selectClass} w-20`}
                min={FONT_SIZE_MIN}
                max={FONT_SIZE_MAX}
                value={settings.fontSize}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  if (next >= FONT_SIZE_MIN && next <= FONT_SIZE_MAX) {
                    updateSetting("fontSize", next);
                  }
                }}
              />
            </Row>

            <Row label={t("settings.tabSize")}>
              <select
                className={selectClass}
                value={settings.tabSize}
                onChange={(e) =>
                  updateSetting("tabSize", Number(e.target.value))
                }
              >
                {TAB_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </Row>

            <Row label={t("settings.insertSpaces")}>
              <input
                type="checkbox"
                className="size-4 accent-[var(--color-accent)]"
                checked={settings.insertSpaces}
                onChange={(e) =>
                  updateSetting("insertSpaces", e.target.checked)
                }
              />
            </Row>

            <Row label={t("settings.wordWrap")}>
              <input
                type="checkbox"
                className="size-4 accent-[var(--color-accent)]"
                checked={settings.wordWrap}
                onChange={(e) => updateSetting("wordWrap", e.target.checked)}
              />
            </Row>

            <Row label={t("settings.lineNumbers")}>
              <input
                type="checkbox"
                className="size-4 accent-[var(--color-accent)]"
                checked={settings.lineNumbers}
                onChange={(e) => updateSetting("lineNumbers", e.target.checked)}
              />
            </Row>

            <Row label={t("settings.ligatures")}>
              <input
                type="checkbox"
                className="size-4 accent-[var(--color-accent)]"
                checked={settings.ligatures}
                onChange={(e) => updateSetting("ligatures", e.target.checked)}
              />
            </Row>

            <Row label={t("settings.markdownLivePreview")}>
              <input
                type="checkbox"
                className="size-4 accent-[var(--color-accent)]"
                checked={settings.markdownLivePreview}
                onChange={(e) =>
                  updateSetting("markdownLivePreview", e.target.checked)
                }
              />
            </Row>
          </div>

          <div className="flex justify-end border-t border-[var(--color-border)] px-4 py-3">
            <button
              type="button"
              onClick={resetSettings}
              className="rounded px-3 py-1 text-sm text-[var(--color-muted)] hover:bg-[var(--color-overlay)] hover:text-[var(--color-text)]"
            >
              {t("settings.reset")}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
