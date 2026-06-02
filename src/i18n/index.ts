import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import zhCN from "./locales/zh-CN.json";

// 多语言注册表。一期支持中文 + 英文;新增语种只需:
// 1) 增 locales/<lang>.json 2) 在此 resources 注册一行,业务代码无需改动。
export const SUPPORTED_LANGUAGES = [
  { code: "zh-CN", label: "简体中文" },
  { code: "en", label: "English" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

export const FALLBACK_LANGUAGE: LanguageCode = "en";

// 启动语言:优先浏览器/系统语言,命中支持列表则用之,否则回退。
function detectInitialLanguage(): LanguageCode {
  const navigatorLang = navigator.language;
  if (navigatorLang.startsWith("zh")) return "zh-CN";
  if (navigatorLang.startsWith("en")) return "en";
  return FALLBACK_LANGUAGE;
}

void i18n.use(initReactI18next).init({
  resources: {
    "zh-CN": { translation: zhCN },
    en: { translation: en },
  },
  lng: detectInitialLanguage(),
  fallbackLng: FALLBACK_LANGUAGE,
  interpolation: { escapeValue: false },
});

export default i18n;
