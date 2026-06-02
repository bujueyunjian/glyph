import type { Extension } from "@codemirror/state";
import { StreamLanguage } from "@codemirror/language";

// 扩展名 → CodeMirror 语言扩展(动态懒加载)。
// 每个语言包用 import() 按需加载,从主包剥离成独立 chunk —— 守住"轻"的 SLO:
// 打开 .rs 才下载 rust 包,不打开就永远不下载。开箱即用、覆盖常见语言(turnkey)。
// 官方 @codemirror/lang-* 走 Lezer;长尾走 @codemirror/legacy-modes 的 StreamLanguage。
// tree-sitter WASM 高亮留 M2。新增语言在此登记一行即可。

// 官方 Lezer 语言:扩展名 → 加载器
const LEZER_LOADERS: Record<string, () => Promise<Extension[]>> = {
  js: async () => [(await import("@codemirror/lang-javascript")).javascript()],
  jsx: async () => [
    (await import("@codemirror/lang-javascript")).javascript({ jsx: true }),
  ],
  ts: async () => [
    (await import("@codemirror/lang-javascript")).javascript({
      typescript: true,
    }),
  ],
  tsx: async () => [
    (await import("@codemirror/lang-javascript")).javascript({
      typescript: true,
      jsx: true,
    }),
  ],
  mjs: async () => [(await import("@codemirror/lang-javascript")).javascript()],
  cjs: async () => [(await import("@codemirror/lang-javascript")).javascript()],
  json: async () => [(await import("@codemirror/lang-json")).json()],
  jsonc: async () => [(await import("@codemirror/lang-json")).json()],
  rs: async () => [(await import("@codemirror/lang-rust")).rust()],
  md: async () => [(await import("@codemirror/lang-markdown")).markdown()],
  markdown: async () => [
    (await import("@codemirror/lang-markdown")).markdown(),
  ],
  css: async () => [(await import("@codemirror/lang-css")).css()],
  html: async () => [(await import("@codemirror/lang-html")).html()],
  htm: async () => [(await import("@codemirror/lang-html")).html()],
  py: async () => [(await import("@codemirror/lang-python")).python()],
  pyw: async () => [(await import("@codemirror/lang-python")).python()],
  sql: async () => [(await import("@codemirror/lang-sql")).sql()],
  yaml: async () => [(await import("@codemirror/lang-yaml")).yaml()],
  yml: async () => [(await import("@codemirror/lang-yaml")).yaml()],
  xml: async () => [(await import("@codemirror/lang-xml")).xml()],
  svg: async () => [(await import("@codemirror/lang-xml")).xml()],
  java: async () => [(await import("@codemirror/lang-java")).java()],
  c: async () => [(await import("@codemirror/lang-cpp")).cpp()],
  h: async () => [(await import("@codemirror/lang-cpp")).cpp()],
  cpp: async () => [(await import("@codemirror/lang-cpp")).cpp()],
  cc: async () => [(await import("@codemirror/lang-cpp")).cpp()],
  cxx: async () => [(await import("@codemirror/lang-cpp")).cpp()],
  hpp: async () => [(await import("@codemirror/lang-cpp")).cpp()],
  hh: async () => [(await import("@codemirror/lang-cpp")).cpp()],
  go: async () => [(await import("@codemirror/lang-go")).go()],
  php: async () => [(await import("@codemirror/lang-php")).php()],
  vue: async () => [(await import("@codemirror/lang-vue")).vue()],
  scss: async () => [
    (await import("@codemirror/lang-sass")).sass({ indented: false }),
  ],
  sass: async () => [
    (await import("@codemirror/lang-sass")).sass({ indented: true }),
  ],
  less: async () => [(await import("@codemirror/lang-less")).less()],
};

// 长尾语言:扩展名 → @codemirror/legacy-modes 的 StreamParser 加载器
const LEGACY_LOADERS: Record<string, () => Promise<Extension[]>> = {
  sh: async () => [
    StreamLanguage.define(
      (await import("@codemirror/legacy-modes/mode/shell")).shell,
    ),
  ],
  bash: async () => [
    StreamLanguage.define(
      (await import("@codemirror/legacy-modes/mode/shell")).shell,
    ),
  ],
  zsh: async () => [
    StreamLanguage.define(
      (await import("@codemirror/legacy-modes/mode/shell")).shell,
    ),
  ],
  toml: async () => [
    StreamLanguage.define(
      (await import("@codemirror/legacy-modes/mode/toml")).toml,
    ),
  ],
  ini: async () => [
    StreamLanguage.define(
      (await import("@codemirror/legacy-modes/mode/properties")).properties,
    ),
  ],
  conf: async () => [
    StreamLanguage.define(
      (await import("@codemirror/legacy-modes/mode/properties")).properties,
    ),
  ],
  dockerfile: async () => [
    StreamLanguage.define(
      (await import("@codemirror/legacy-modes/mode/dockerfile")).dockerFile,
    ),
  ],
  lua: async () => [
    StreamLanguage.define(
      (await import("@codemirror/legacy-modes/mode/lua")).lua,
    ),
  ],
  rb: async () => [
    StreamLanguage.define(
      (await import("@codemirror/legacy-modes/mode/ruby")).ruby,
    ),
  ],
  pl: async () => [
    StreamLanguage.define(
      (await import("@codemirror/legacy-modes/mode/perl")).perl,
    ),
  ],
  swift: async () => [
    StreamLanguage.define(
      (await import("@codemirror/legacy-modes/mode/swift")).swift,
    ),
  ],
  r: async () => [
    StreamLanguage.define((await import("@codemirror/legacy-modes/mode/r")).r),
  ],
  jl: async () => [
    StreamLanguage.define(
      (await import("@codemirror/legacy-modes/mode/julia")).julia,
    ),
  ],
  clj: async () => [
    StreamLanguage.define(
      (await import("@codemirror/legacy-modes/mode/clojure")).clojure,
    ),
  ],
  hs: async () => [
    StreamLanguage.define(
      (await import("@codemirror/legacy-modes/mode/haskell")).haskell,
    ),
  ],
  ps1: async () => [
    StreamLanguage.define(
      (await import("@codemirror/legacy-modes/mode/powershell")).powerShell,
    ),
  ],
  cmake: async () => [
    StreamLanguage.define(
      (await import("@codemirror/legacy-modes/mode/cmake")).cmake,
    ),
  ],
};

/** 按扩展名异步加载 CodeMirror 语言扩展;未识别返回空数组(纯文本)。 */
export async function loadLanguageExtension(
  extension: string,
): Promise<Extension[]> {
  const loader = LEZER_LOADERS[extension] ?? LEGACY_LOADERS[extension];
  return loader ? loader() : [];
}
