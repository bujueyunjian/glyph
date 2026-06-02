import { type ReactNode, useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { StatusBar } from "./StatusBar";

interface WorkbenchLayoutProps {
  appVersion?: string;
  /** 当前文档标签(文件名),脏文件由调用方加 • 标记。 */
  documentLabel?: string;
  /** 左上角应用菜单栏。 */
  menu?: ReactNode;
  /** 左侧栏(文件树等);为空则不显示。 */
  sidebar?: ReactNode;
  children: ReactNode;
}

const SIDEBAR_WIDTH_KEY = "glyph.sidebarWidth";
const MIN_WIDTH = 160;
const MAX_WIDTH = 480;

function readWidth(): number {
  const stored = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY));
  return stored >= MIN_WIDTH && stored <= MAX_WIDTH ? stored : 240;
}

// 应用外壳布局:顶部(左菜单 + 中文档名)+ 主内容区 + 底部状态栏。
// 侧栏可拖拽改宽(localStorage 持久化);主内容区由调用方注入。
export function WorkbenchLayout({
  appVersion,
  documentLabel,
  menu,
  sidebar,
  children,
}: WorkbenchLayoutProps) {
  const { t } = useTranslation();
  const [sidebarWidth, setSidebarWidth] = useState(readWidth);
  const widthRef = useRef(sidebarWidth);

  // 拖拽分隔条改宽度;闭包内用 ref 存最新值,松手时持久化。
  const startResize = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = widthRef.current;
    const onMove = (e: MouseEvent) => {
      const next = Math.min(
        MAX_WIDTH,
        Math.max(MIN_WIDTH, startWidth + e.clientX - startX),
      );
      widthRef.current = next;
      setSidebarWidth(next);
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      try {
        localStorage.setItem(SIDEBAR_WIDTH_KEY, String(widthRef.current));
      } catch {
        // 持久化失败不致命
      }
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);

  return (
    <div className="flex h-full w-full flex-col">
      <header className="relative flex h-9 shrink-0 items-center border-b border-[var(--color-border)] bg-[var(--color-surface)] px-2 select-none">
        <div className="flex items-center gap-2">{menu}</div>
        {/* 文档名居中(绝对定位,不挤压菜单) */}
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-sm">
          <span className="text-[var(--color-subtle)]">{t("app.name")}</span>
          {documentLabel ? (
            <>
              <span className="mx-1.5 text-[var(--color-subtle)]">/</span>
              <span className="text-[var(--color-text)]">{documentLabel}</span>
            </>
          ) : null}
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        {sidebar ? (
          <aside
            className="relative shrink-0 overflow-hidden border-r border-[var(--color-border)] bg-[var(--color-surface)]"
            style={{ width: sidebarWidth }}
          >
            {sidebar}
            {/* 右缘拖拽手柄:改侧栏宽度 */}
            <div
              onMouseDown={startResize}
              className="absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-[var(--color-accent)]"
            />
          </aside>
        ) : null}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <StatusBar appVersion={appVersion} />
    </div>
  );
}
