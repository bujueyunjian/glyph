// 首屏体积预算门禁(性能红线「轻」的自动化守门)。
// 把「靠人眼看 vite 的 >500KB 警告」换成可在 CI/本地跑的硬门禁:
// 解析 dist/index.html 直接引用的 JS(entry + modulepreload 的静态依赖)= 首屏 JS,
// gzip 求和与预算比较。懒加载块(CodeEditor / 语言包)不在 index.html 中,自动排除。
//
// 用法:pnpm build && pnpm perf:budget
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const DIST = "dist";
// 首屏 JS gzip 预算(KB)。当前 ~130KB;留头寸又能挡住「把 CodeMirror 静态拉回首屏」级回退。
const BUDGET_GZIP_KB = 170;

const html = readFileSync(join(DIST, "index.html"), "utf8");
const refs = [...html.matchAll(/(?:src|href)="\/?([^"]+\.js)"/g)].map(
  (m) => m[1],
);
const firstPaint = [...new Set(refs)];

if (firstPaint.length === 0) {
  console.error("❌ 未在 dist/index.html 找到首屏 JS 引用(先 pnpm build?)");
  process.exit(1);
}

let totalGzip = 0;
for (const ref of firstPaint) {
  totalGzip += gzipSync(readFileSync(join(DIST, ref))).length;
}
const kb = totalGzip / 1024;

console.log(
  `首屏 JS gzip = ${kb.toFixed(1)} KB / 预算 ${BUDGET_GZIP_KB} KB（${firstPaint.length} 个 chunk）`,
);

if (kb > BUDGET_GZIP_KB) {
  console.error(
    `❌ 首屏体积超预算 ${BUDGET_GZIP_KB} KB —— 检查是否有重依赖被静态拉进首屏(性能红线)`,
  );
  process.exit(1);
}
console.log("✅ 首屏体积在预算内");
