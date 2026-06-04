import { useTranslation } from "react-i18next";

import type { LspStatus } from "@/hooks/useLsp";

interface StatusBarProps {
  appVersion?: string;
  /** 当前文件名(无打开文件则显示就绪态)。 */
  fileName?: string;
  /** 当前文件语言/扩展名。 */
  language?: string;
  /** 语言服务器连接状态。 */
  lsp?: LspStatus;
  onCommandPalette: () => void;
  onSearch: () => void;
  onToggleSplit: () => void;
}

// LSP 状态点:就绪=accent 实心,连接中=黄,未连接/未安装=灰。
const LSP_DOT: Record<string, string> = {
  ready: "bg-[var(--color-accent)]",
  starting: "bg-amber-400",
  unavailable: "bg-[var(--color-subtle)]",
};

const actionClass =
  "rounded px-1.5 py-0.5 outline-none hover:bg-[var(--color-overlay)] hover:text-[var(--color-text)]";

// 底部状态栏:左显当前文件/语言,右为常用功能可点入口(搜索/分屏/命令面板)。
// 低对比、克制(设计准则 #4),代码区才是焦点;入口让功能可被发现,而非藏在快捷键后。
export function StatusBar({
  appVersion,
  fileName,
  language,
  lsp,
  onCommandPalette,
  onSearch,
  onToggleSplit,
}: StatusBarProps) {
  const { t } = useTranslation();
  return (
    <footer className="flex h-7 shrink-0 items-center justify-between gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-xs text-[var(--color-muted)] select-none">
      <div className="flex min-w-0 items-center gap-2">
        {fileName ? (
          <>
            <span className="truncate text-[var(--color-text)]">
              {fileName}
            </span>
            {language ? <span className="uppercase">{language}</span> : null}
          </>
        ) : (
          <span>{t("workbench.statusReady")}</span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        {lsp && lsp.state !== "off" ? (
          <span
            className="mr-1 flex items-center gap-1"
            title={
              lsp.state === "unavailable"
                ? t("lsp.unavailable", { name: lsp.name })
                : `LSP: ${lsp.name}`
            }
          >
            <span
              className={`size-1.5 rounded-full ${LSP_DOT[lsp.state] ?? ""}`}
            />
            <span className="text-[var(--color-subtle)]">{lsp.name}</span>
          </span>
        ) : null}
        <button
          type="button"
          className={actionClass}
          onClick={onSearch}
          title="Ctrl/⌘ ⇧ F"
        >
          {t("statusbar.search")}
        </button>
        <button
          type="button"
          className={actionClass}
          onClick={onToggleSplit}
          title="Ctrl/⌘ \"
        >
          {t("statusbar.split")}
        </button>
        <button
          type="button"
          className={actionClass}
          onClick={onCommandPalette}
          title="Ctrl/⌘ ⇧ P"
        >
          {t("statusbar.commands")}
        </button>
        {appVersion ? (
          <span className="ml-1 text-[var(--color-subtle)]">v{appVersion}</span>
        ) : null}
      </div>
    </footer>
  );
}
