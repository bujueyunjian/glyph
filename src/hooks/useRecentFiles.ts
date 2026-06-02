import { useCallback, useState } from "react";

const STORAGE_KEY = "glyph.recentFiles";
const MAX_RECENT = 12;

function readStored(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function persist(list: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // 隐私模式等持久化失败不致命,当次内存仍可用。
  }
}

// 最近打开文件(localStorage 持久化,去重 + 上限)。新打开置顶。
export function useRecentFiles() {
  const [recent, setRecent] = useState<string[]>(readStored);

  const addRecent = useCallback((path: string) => {
    setRecent((prev) => {
      const next = [path, ...prev.filter((p) => p !== path)].slice(
        0,
        MAX_RECENT,
      );
      persist(next);
      return next;
    });
  }, []);

  const clearRecent = useCallback(() => {
    setRecent([]);
    persist([]);
  }, []);

  return { recent, addRecent, clearRecent };
}
