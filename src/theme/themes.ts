// 主题系统:主题即一组语义 token(数据)。运行时把 token 写到 documentElement
// 的 CSS 变量上,覆盖 styles.css `@theme` 的默认值,实现即时切换。
// 预留扩展:主题插件 / 用户自定义主题只需提供同形 token map(见 ADR-0005)。

export type ThemeKind = "dark" | "light";

// 语义 token(与 styles.css @theme 的 --color-* 对应)。
export interface ThemeTokens {
  bg: string;
  surface: string;
  overlay: string;
  border: string;
  text: string;
  muted: string;
  subtle: string;
  accent: string;
}

export interface Theme {
  id: string;
  label: string;
  kind: ThemeKind;
  tokens: ThemeTokens;
}

// 内置主题。默认 "glyph-dark" 是柔和深色(不再纯黑);
// "glyph-light" 浅色;"midnight" 给偏好纯黑的用户。
export const BUILTIN_THEMES: Theme[] = [
  {
    id: "glyph-dark",
    label: "Glyph Dark",
    kind: "dark",
    tokens: {
      bg: "#1a1b1e",
      surface: "#212327",
      overlay: "#2a2c31",
      border: "#383b41",
      text: "#e6e7e9",
      muted: "#a6a9b0",
      subtle: "#7e828b",
      accent: "#6aa8ff",
    },
  },
  {
    id: "glyph-light",
    label: "Glyph Light",
    kind: "light",
    tokens: {
      bg: "#ffffff",
      surface: "#f4f5f7",
      overlay: "#e8eaed",
      border: "#d6d9de",
      text: "#1b1d21",
      muted: "#5c6066",
      subtle: "#8a8f97",
      accent: "#2f6fed",
    },
  },
  {
    id: "midnight",
    label: "Midnight",
    kind: "dark",
    tokens: {
      bg: "#0e0f11",
      surface: "#1b1d21",
      overlay: "#24272c",
      border: "#33363c",
      text: "#e6e7e9",
      muted: "#a3a6ad",
      subtle: "#7c8088",
      accent: "#6aa8ff",
    },
  },
];

export const DEFAULT_THEME_ID = "glyph-dark";

export function getThemeById(id: string): Theme | undefined {
  return BUILTIN_THEMES.find((theme) => theme.id === id);
}

// 把主题 token 写到 :root(documentElement),并设置 color-scheme 让原生
// 控件/滚动条跟随明暗。内联样式优先级高于 @theme 的 :root 规则,故能覆盖。
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(theme.tokens)) {
    root.style.setProperty(`--color-${key}`, value);
  }
  root.style.colorScheme = theme.kind;
  root.dataset.theme = theme.id;
}
