import DOMPurify from "dompurify";

// mermaid 全部逻辑隔离于此——本文件是**唯一** import("mermaid") 的地方,且只在确有 mermaid 块时
// 由 MarkdownPreview 调用,故 mermaid(~MB 级)落入按需 async chunk,绝不进首屏(footprint 红线,ADR-0010 同源思路)。

type ThemeKind = "dark" | "light";

let mermaidPromise: Promise<typeof import("mermaid").default> | null = null;
let initializedKind: ThemeKind | null = null;
// 已渲染 SVG 缓存(键含主题,主题影响配色)。预览每次刷新都会重建 DOM,靠此缓存跳过未变图的重渲染。
const svgCache = new Map<string, string>();
const CACHE_CAP = 200;
let idCounter = 0;

function loadMermaid() {
  mermaidPromise ??= import("mermaid").then((m) => m.default);
  return mermaidPromise;
}

function injectError(block: HTMLElement, message: string) {
  block.textContent = "";
  const pre = document.createElement("pre");
  pre.className = "mermaid-error";
  pre.textContent = `Mermaid 渲染失败: ${message}`;
  block.appendChild(pre);
}

// 渲染容器内所有 .mermaid-block。命中缓存直接复用;未命中才动态 import + render + 二次消毒 SVG。
// 失败响亮:单块坏图显示内联错误,绝不静默吞、绝不白屏(ADR-0002)。
export async function renderMermaidBlocks(
  root: HTMLElement,
  themeKind: ThemeKind,
  isCancelled: () => boolean,
): Promise<void> {
  const blocks = Array.from(
    root.querySelectorAll<HTMLElement>(".mermaid-block"),
  );
  if (blocks.length === 0) return;

  // 第一遍:缓存命中的同步填充,收集未命中的待渲染。
  const pending: { block: HTMLElement; key: string; src: string }[] = [];
  for (const block of blocks) {
    const hash = block.dataset.mermaidHash ?? "";
    const key = `${themeKind}:${hash}`;
    const cached = svgCache.get(key);
    if (cached) {
      block.innerHTML = cached;
      continue;
    }
    const src = block.querySelector(".mermaid-src")?.textContent ?? "";
    pending.push({ block, key, src });
  }
  if (pending.length === 0) return;

  const mermaid = await loadMermaid();
  if (isCancelled()) return;

  // 主题变化或首次:重新 initialize。strict 防不可信 .md;htmlLabels:false 用原生 <text>,避开
  // foreignObject 被 DOMPurify 剥空;startOnLoad:false 由我们手动驱动,不让 mermaid 绕过消毒自扫描注入。
  if (initializedKind !== themeKind) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: themeKind === "dark" ? "dark" : "default",
      fontFamily: "'Geist Variable', system-ui, sans-serif",
      // 顶层 htmlLabels:false 才真正禁用 foreignObject(仅设 flowchart.htmlLabels 无效);
      // 否则标签走 <foreignObject> HTML,会被 DOMPurify 的 SVG profile 剥空(实测)。
      htmlLabels: false,
      flowchart: { htmlLabels: false },
    });
    initializedKind = themeKind;
  }

  for (const { block, key, src } of pending) {
    if (isCancelled()) return;
    try {
      const { svg } = await mermaid.render(`glyph-mermaid-${idCounter++}`, src);
      if (isCancelled()) return;
      // 防御纵深:即便 strict,仍对输出 SVG 二次消毒(strict 历史上仍出过可执行输出)。
      const safeSvg = DOMPurify.sanitize(svg, {
        USE_PROFILES: { svg: true, svgFilters: true },
      });
      if (svgCache.size >= CACHE_CAP) svgCache.clear();
      svgCache.set(key, safeSvg);
      block.innerHTML = safeSvg;
    } catch (err) {
      injectError(block, err instanceof Error ? err.message : String(err));
    }
  }
}
