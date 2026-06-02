import { useTranslation } from "react-i18next";
import { FileText } from "lucide-react";

// 空态:安静的引导,而非营销(设计准则 #5「显示内容,不显示转圈」、
// 错误/空态是教学)。后续接入命令面板后这里展示快捷键速查表。
export function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-center select-none">
      <FileText
        className="size-10 text-[var(--color-subtle)]"
        strokeWidth={1.5}
      />
      <div className="text-lg text-[var(--color-text)]">
        {t("workbench.emptyTitle")}
      </div>
      <div className="text-sm text-[var(--color-muted)]">
        {t("workbench.emptyHint")}
      </div>
    </div>
  );
}
