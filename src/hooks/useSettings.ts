import { useCallback, useState } from "react";

import { DEFAULT_SETTINGS, type EditorSettings } from "@/types/settingsTypes";

const STORAGE_KEY = "glyph.settings";

function readStored(): EditorSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    // 与默认值合并:新增设置项对老用户也有默认,不会缺键。
    return raw
      ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<EditorSettings>) }
      : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function persist(settings: EditorSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // 持久化失败不致命,当次内存仍生效。
  }
}

// 用户偏好设置:localStorage 持久化,改即存即用。
export function useSettings() {
  const [settings, setSettings] = useState<EditorSettings>(readStored);

  const updateSetting = useCallback(
    <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value };
        persist(next);
        return next;
      });
    },
    [],
  );

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    persist(DEFAULT_SETTINGS);
  }, []);

  return { settings, updateSetting, resetSettings };
}
