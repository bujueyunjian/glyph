import { useCallback } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { readJson, writeJson } from "@/utils/storage";

const STORAGE_KEY = "glyph.session";

export interface SessionState {
  openPaths: string[];
  activePath: string | null;
  /** 每个文件的光标偏移(doc 内字符位置),用于恢复光标并滚动入视。 */
  cursors: Record<string, number>;
}

// 最小会话恢复:仅记录打开的文件与激活项(localStorage)。
// 失败两态(对齐「失败响亮 · 禁止静默兜底」):缺=预期空态(返回 null,不报错);
// 坏 JSON=响亮报错(toast)并忽略旧会话,绝不静默回空。
export function useSession() {
  const { t } = useTranslation();

  const loadSession = useCallback((): SessionState | null => {
    const { value, corrupted } = readJson<SessionState>(STORAGE_KEY);
    if (corrupted) toast.error(t("storage.sessionCorrupted"));
    return value;
  }, [t]);

  const saveSession = useCallback(
    (
      openPaths: string[],
      activePath: string | null,
      cursors: Record<string, number>,
    ) => {
      writeJson(STORAGE_KEY, {
        openPaths,
        activePath,
        cursors,
      } satisfies SessionState);
    },
    [],
  );

  return { loadSession, saveSession };
}
