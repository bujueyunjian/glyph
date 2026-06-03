import { useCallback, useRef, useState } from "react";
import {
  open as openDialog,
  save as saveDialog,
} from "@tauri-apps/plugin-dialog";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { openFile, saveFile } from "@/api/fileApi";
import { getFileName } from "@/utils/path";

export interface EditorTab {
  path: string;
  /** 仅作编辑器挂载时的初始内容;之后文档由对应 CodeMirror 实例持有。 */
  initialContent: string;
  isDirty: boolean;
}

// 多标签编辑状态。文档内容不在 React state,由各标签的 CodeMirror 实例持有;
// 保存时通过 getContent(path)(上层注入,读对应 editor ref)取内容。
// 用 ref 同步 tabs/activePath,使所有回调保持稳定(便于挂到全局快捷键)。
export function useEditorTabs(
  getContent: (path: string) => string,
  onFileOpened?: (path: string) => void,
) {
  const { t } = useTranslation();
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const tabsRef = useRef<EditorTab[]>([]);
  const activePathRef = useRef<string | null>(null);

  const writeTabs = useCallback((next: EditorTab[]) => {
    tabsRef.current = next;
    setTabs(next);
  }, []);

  const activate = useCallback((path: string | null) => {
    activePathRef.current = path;
    setActivePath(path);
  }, []);

  // 按已知路径打开:已打开则仅激活,否则读盘 + 新建标签 + 激活。
  const openPath = useCallback(
    async (path: string) => {
      if (tabsRef.current.some((tab) => tab.path === path)) {
        activate(path);
        onFileOpened?.(path);
        return;
      }
      try {
        const content = await openFile(path);
        writeTabs([
          ...tabsRef.current,
          { path, initialContent: content, isDirty: false },
        ]);
        activate(path);
        onFileOpened?.(path);
      } catch (err) {
        toast.error(t("file.openFailed", { msg: (err as Error).message }));
      }
    },
    [activate, writeTabs, t, onFileOpened],
  );

  const open = useCallback(async () => {
    const selected = await openDialog({ multiple: false, directory: false });
    if (typeof selected !== "string") return; // 用户取消
    await openPath(selected);
  }, [openPath]);

  // 用户编辑只标脏;已脏则返回原引用让 React bail-out,不每键 churn。
  const markDirty = useCallback(
    (path: string) => {
      const current = tabsRef.current;
      const tab = current.find((item) => item.path === path);
      if (!tab || tab.isDirty) return;
      writeTabs(
        current.map((item) =>
          item.path === path ? { ...item, isDirty: true } : item,
        ),
      );
    },
    [writeTabs],
  );

  const setActive = useCallback(
    (path: string) => {
      activate(path);
    },
    [activate],
  );

  // 撤销关闭:把内容快照重新插回原位置并激活(脏标签关闭后可一键找回)。
  const restoreTab = useCallback(
    (idx: number, path: string, content: string) => {
      const current = tabsRef.current;
      if (current.some((tab) => tab.path === path)) {
        activate(path); // 已被重新打开,仅激活
        return;
      }
      const at = Math.min(idx, current.length);
      const restored: EditorTab = {
        path,
        initialContent: content,
        isDirty: true,
      };
      writeTabs([...current.slice(0, at), restored, ...current.slice(at)]);
      activate(path);
    },
    [writeTabs, activate],
  );

  const closeTab = useCallback(
    (path: string) => {
      const prev = tabsRef.current;
      const idx = prev.findIndex((tab) => tab.path === path);
      if (idx === -1) return;
      // 关闭脏标签前先抓内容快照:实例随移除而卸载,否则无从撤销。
      const snapshot = prev[idx].isDirty ? getContent(path) : null;

      const next = prev.filter((tab) => tab.path !== path);
      writeTabs(next);
      if (activePathRef.current === path) {
        activate(
          next.length === 0 ? null : next[Math.min(idx, next.length - 1)].path,
        );
      }

      // 脏标签:撤销优于确认(准则 #9)。给可撤销 toast,而非静默丢弃未保存内容。
      if (snapshot !== null) {
        toast(t("file.closedUnsaved", { name: getFileName(path) }), {
          action: {
            label: t("common.undo"),
            onClick: () => restoreTab(idx, path, snapshot),
          },
        });
      }
    },
    [writeTabs, activate, getContent, t, restoreTab],
  );

  const save = useCallback(async () => {
    const path = activePathRef.current;
    if (!path) return;
    try {
      await saveFile(path, getContent(path));
      writeTabs(
        tabsRef.current.map((tab) =>
          tab.path === path ? { ...tab, isDirty: false } : tab,
        ),
      );
      toast.success(t("file.saved"));
    } catch (err) {
      toast.error(t("file.saveFailed", { msg: (err as Error).message }));
    }
  }, [getContent, writeTabs, t]);

  const saveAs = useCallback(async () => {
    const path = activePathRef.current;
    if (!path) return;
    const picked = await saveDialog({ defaultPath: path });
    if (typeof picked !== "string") return; // 用户取消
    const content = getContent(path);
    try {
      await saveFile(picked, content);
      // 改路径 = 改 key 重挂载,内容用 initialContent 保留。
      writeTabs(
        tabsRef.current.map((tab) =>
          tab.path === path
            ? { path: picked, initialContent: content, isDirty: false }
            : tab,
        ),
      );
      activate(picked);
      toast.success(t("file.saved"));
    } catch (err) {
      toast.error(t("file.saveFailed", { msg: (err as Error).message }));
    }
  }, [getContent, writeTabs, activate, t]);

  return {
    tabs,
    activePath,
    open,
    openPath,
    setActive,
    closeTab,
    save,
    saveAs,
    markDirty,
  };
}
