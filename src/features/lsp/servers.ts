// 扩展名 → 语言服务器命令。Glyph 不打包服务器(守"轻"):用户装了哪个就接哪个,
// 没装则状态栏静默显示"未连接"(预期空态,非错误)。命令需在 PATH 中。
export interface LanguageServer {
  /** 状态栏显示名。 */
  name: string;
  /** 可执行命令。 */
  command: string;
  /** 启动参数(多数 LSP 用 --stdio)。 */
  args: string[];
}

const SERVERS: Record<string, LanguageServer> = {
  rs: { name: "rust-analyzer", command: "rust-analyzer", args: [] },
  ts: tsServer(),
  tsx: tsServer(),
  js: tsServer(),
  jsx: tsServer(),
  mjs: tsServer(),
  cjs: tsServer(),
  py: { name: "pyright", command: "pyright-langserver", args: ["--stdio"] },
  pyw: { name: "pyright", command: "pyright-langserver", args: ["--stdio"] },
  go: { name: "gopls", command: "gopls", args: [] },
  c: clangd(),
  h: clangd(),
  cpp: clangd(),
  cc: clangd(),
  cxx: clangd(),
  hpp: clangd(),
};

function tsServer(): LanguageServer {
  return {
    name: "typescript-language-server",
    command: "typescript-language-server",
    args: ["--stdio"],
  };
}

function clangd(): LanguageServer {
  return { name: "clangd", command: "clangd", args: [] };
}

export function serverForExtension(ext: string): LanguageServer | null {
  return SERVERS[ext] ?? null;
}
