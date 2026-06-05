import DOMPurify from "dompurify";
import { marked, type Tokens } from "marked";

// Markdown 渲染:marked 解析(GFM)→ DOMPurify 消毒。绝不裸传 raw HTML(ADR-0002 安全红线)。
// 运行于浏览器/WebView(依赖全局 window);单测以 vitest jsdom 环境提供 window。
marked.setOptions({ gfm: true });

// 轻量字符串哈希(djb2):标记 mermaid 块、供预览端跨渲染复用已生成的 SVG(不引依赖)。
function hashSource(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) {
    h = (((h << 5) + h) ^ text.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// mermaid 围栏 → 惰性占位符:源码作转义文本承载,绝不在此渲染 SVG(真正渲染在 MarkdownPreview 的
// effect 里按需动态 import mermaid)。其余语言交还 marked 默认渲染(return false)。
marked.use({
  renderer: {
    code(token: Tokens.Code): string | false {
      if (token.lang !== "mermaid") return false;
      const hash = hashSource(token.text);
      return `<div class="mermaid-block" data-mermaid-hash="${hash}"><pre class="mermaid-src">${escapeHtml(
        token.text,
      )}</pre></div>`;
    },
  },
});

/** 把 Markdown 源码渲染为已消毒的安全 HTML。 */
export function renderMarkdown(source: string): string {
  const rawHtml = marked.parse(source, { async: false });
  // 保留 mermaid 占位符的 data-* 标记;普通 MD 的消毒 allowlist 不放宽(mermaid 不得借机削弱安全)。
  return DOMPurify.sanitize(rawHtml, { ADD_ATTR: ["data-mermaid-hash"] });
}
