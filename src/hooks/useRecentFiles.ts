import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { readJson, writeJson } from "@/utils/storage";

const STORAGE_KEY = "glyph.recentFiles";
const MAX_RECENT = 12;

// 启动时读到坏 JSON 的标记:不静默吞,挂载后响亮 toast(见 utils/storage 两态说明)。
let bootCorrupted = false;

function readStored(): string[] {
  const { value, corrupted } = readJson<string[]>(STORAGE_KEY);
  if (corrupted) bootCorrupted = true;
  return value ?? [];
}

// 最近打开文件(localStorage 持久化,去重 + 上限)。新打开置顶。
export function useRecentFiles() {
  const { t } = useTranslation();
  const [recent, setRecent] = useState<string[]>(readStored);

  // 记录损坏时响亮告知(已清空,非静默兜底)。
  useEffect(() => {
    if (bootCorrupted) {
      bootCorrupted = false;
      toast.error(t("storage.recentCorrupted"));
    }
  }, [t]);

  const addRecent = useCallback((path: string) => {
    setRecent((prev) => {
      const next = [path, ...prev.filter((p) => p !== path)].slice(
        0,
        MAX_RECENT,
      );
      writeJson(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const clearRecent = useCallback(() => {
    setRecent([]);
    writeJson(STORAGE_KEY, []);
  }, []);

  return { recent, addRecent, clearRecent };
}
