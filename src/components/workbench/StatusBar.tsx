import { useTranslation } from "react-i18next";

interface StatusBarProps {
  appVersion?: string;
}

// 底部状态栏(纯展示)。低对比、克制,代码区才是高对比焦点(设计准则 #4)。
export function StatusBar({ appVersion }: StatusBarProps) {
  const { t } = useTranslation();
  return (
    <footer className="flex h-7 shrink-0 items-center justify-between border-t border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs text-[var(--color-muted)] select-none">
      <span>{t("workbench.statusReady")}</span>
      {appVersion ? <span>v{appVersion}</span> : null}
    </footer>
  );
}
