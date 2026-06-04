import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { pushRecent } from "@/utils/recentList";
import { readJson, writeJson } from "@/utils/storage";

const STORAGE_KEY = "glyph.recentFolders";
const MAX_RECENT = 10;

// 启动时读到坏 JSON 的标记:挂载后响亮 toast,不静默吞(对齐 useRecentFiles)。
let bootCorrupted = false;

function readStored(): string[] {
  const { value, corrupted } = readJson<string[]>(STORAGE_KEY);
  if (corrupted) bootCorrupted = true;
  return value ?? [];
}

// 最近打开的工作区文件夹(localStorage 持久化,去重 + 上限)。新打开置顶。
export function useRecentFolders() {
  const { t } = useTranslation();
  const [recentFolders, setRecentFolders] = useState<string[]>(readStored);

  // 损坏时真正清空坏数据(使"已清空"成真,且不再每次启动反复告警)。
  useEffect(() => {
    if (bootCorrupted) {
      bootCorrupted = false;
      writeJson(STORAGE_KEY, []);
      toast.error(t("storage.recentFoldersCorrupted"));
    }
  }, [t]);

  const addRecentFolder = useCallback((path: string) => {
    setRecentFolders((prev) => {
      const next = pushRecent(prev, path, MAX_RECENT);
      writeJson(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const clearRecentFolders = useCallback(() => {
    setRecentFolders([]);
    writeJson(STORAGE_KEY, []);
  }, []);

  return { recentFolders, addRecentFolder, clearRecentFolders };
}
