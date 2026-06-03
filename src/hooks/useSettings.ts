import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { DEFAULT_SETTINGS, type EditorSettings } from "@/types/settingsTypes";
import { readJson, writeJson } from "@/utils/storage";

const STORAGE_KEY = "glyph.settings";

// 启动时读到坏 JSON 的标记:不静默吞,挂载后响亮 toast(见 utils/storage 两态说明)。
let bootCorrupted = false;

function readStored(): EditorSettings {
  const { value, corrupted } = readJson<Partial<EditorSettings>>(STORAGE_KEY);
  if (corrupted) bootCorrupted = true;
  // 与默认值合并:新增设置项对老用户也有默认,不会缺键。
  return value ? { ...DEFAULT_SETTINGS, ...value } : DEFAULT_SETTINGS;
}

// 用户偏好设置:localStorage 持久化,改即存即用。
export function useSettings() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<EditorSettings>(readStored);

  // 设置损坏时响亮告知(已降级为默认值,非静默兜底)。
  useEffect(() => {
    if (bootCorrupted) {
      bootCorrupted = false;
      toast.error(t("storage.settingsCorrupted"));
    }
  }, [t]);

  const updateSetting = useCallback(
    <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value };
        writeJson(STORAGE_KEY, next);
        return next;
      });
    },
    [],
  );

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    writeJson(STORAGE_KEY, DEFAULT_SETTINGS);
  }, []);

  return { settings, updateSetting, resetSettings };
}
