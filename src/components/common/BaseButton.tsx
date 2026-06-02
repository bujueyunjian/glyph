import type { ButtonHTMLAttributes, ReactNode } from "react";

interface BaseButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
}

// 基础按钮(克制的工具栏样式):安静 chrome,hover 才轻微抬亮。
export function BaseButton({ icon, children, ...rest }: BaseButtonProps) {
  return (
    <button
      type="button"
      className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-[var(--color-muted)] transition-colors hover:bg-[var(--color-overlay)] hover:text-[var(--color-text)]"
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
