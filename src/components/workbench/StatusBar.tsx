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
}

// LSP 状态点:就绪=accent 实心,连接中=黄,未连接/未安装=灰。
const LSP_DOT: Record<string, string> = {
  ready: "bg-[var(--color-accent)]",
  starting: "bg-amber-400",
  unavailable: "bg-[var(--color-subtle)]",
};

// 底部状态栏:只显状态(文件 / 语言 / 语言服务器 / 版本),不放命令入口——
// 操作归右键上下文菜单与顶部菜单栏。低对比、克制(设计准则 #4),代码区才是焦点。
export function StatusBar({
  appVersion,
  fileName,
  language,
  lsp,
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
      <div className="flex shrink-0 items-center gap-2">
        {lsp && lsp.state !== "off" ? (
          <span
            className="flex items-center gap-1"
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
        {appVersion ? (
          <span className="text-[var(--color-subtle)]">v{appVersion}</span>
        ) : null}
      </div>
    </footer>
  );
}
