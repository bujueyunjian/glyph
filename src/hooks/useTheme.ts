import { useCallback, useEffect, useState } from "react";

import {
  applyTheme,
  BUILTIN_THEMES,
  DEFAULT_THEME_ID,
  getThemeById,
  type Theme,
} from "@/theme/themes";

const STORAGE_KEY = "glyph.theme";

function readStoredThemeId(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_THEME_ID;
  } catch {
    return DEFAULT_THEME_ID;
  }
}

// 主题状态管理:挂载即应用、切换即持久化(localStorage,后续可迁到 Rust 设置)。
export function useTheme() {
  const [themeId, setThemeId] = useState<string>(readStoredThemeId);

  useEffect(() => {
    const theme = getThemeById(themeId) ?? BUILTIN_THEMES[0];
    applyTheme(theme);
  }, [themeId]);

  const setTheme = useCallback((id: string) => {
    setThemeId(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // 持久化失败不致命(隐私模式等),当次仍生效。
    }
  }, []);

  const activeTheme: Theme = getThemeById(themeId) ?? BUILTIN_THEMES[0];

  return { themes: BUILTIN_THEMES, activeTheme, setTheme };
}
