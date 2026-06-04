// 用户偏好设置(localStorage 持久化)。新增项在此加默认值即可。
export interface EditorSettings {
  fontSize: number; // 编辑器字号(px)
  tabSize: number; // Tab 宽度(空格数)
  insertSpaces: boolean; // 缩进用空格(否则用 Tab)
  wordWrap: boolean; // 自动换行
  lineNumbers: boolean; // 显示行号
  ligatures: boolean; // 连字(默认关,见设计准则)
  markdownLivePreview: boolean; // Markdown 行内实时预览:隐藏非光标行的语法标记(默认开)
  fontFamily: string; // 编辑器字体族(空 = 默认 Geist Mono)
}

export const DEFAULT_SETTINGS: EditorSettings = {
  fontSize: 14,
  tabSize: 2,
  insertSpaces: true,
  wordWrap: false,
  lineNumbers: true,
  ligatures: false,
  markdownLivePreview: true,
  fontFamily: "",
};

export const FONT_SIZE_MIN = 10;
export const FONT_SIZE_MAX = 28;
export const TAB_SIZE_OPTIONS = [2, 4, 8] as const;

// 字体族预设:value 为 CSS font-family,空值用默认 Geist Mono。label 给设置面板显示。
export const FONT_FAMILY_OPTIONS = [
  { value: "", label: "Geist Mono" },
  { value: '"JetBrains Mono", monospace', label: "JetBrains Mono" },
  { value: '"Fira Code", monospace', label: "Fira Code" },
  {
    value: '"SF Mono", "Cascadia Code", Consolas, monospace',
    label: "系统等宽",
  },
] as const;
