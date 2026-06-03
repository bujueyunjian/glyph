import DOMPurify from "dompurify";
import { marked } from "marked";

// Markdown 渲染:marked 解析(GFM)→ DOMPurify 消毒。绝不裸传 raw HTML(ADR-0002 安全红线)。
// 运行于浏览器/WebView(依赖全局 window);单测以 vitest jsdom 环境提供 window。
marked.setOptions({ gfm: true });

/** 把 Markdown 源码渲染为已消毒的安全 HTML。 */
export function renderMarkdown(source: string): string {
  const rawHtml = marked.parse(source, { async: false });
  return DOMPurify.sanitize(rawHtml);
}
