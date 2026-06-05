import { useEffect, useMemo, useRef } from "react";

import { renderMarkdown } from "@/features/markdown/render";
import { renderMermaidBlocks } from "@/features/markdown/mermaid";

interface MarkdownPreviewProps {
  content: string;
  /** 当前主题明暗,映射 mermaid 主题(midnight 也是 dark)。 */
  themeKind: "dark" | "light";
}

// Markdown 预览(按需分屏,ADR-0002 v1)。内容经 renderMarkdown(marked + DOMPurify 消毒)同步注入;
// 若含 ```mermaid 块,则在 effect 里按需动态 import mermaid 渲染成图(SVG 二次消毒后注入)。
// 本组件经 React.lazy 加载,故 marked/dompurify/mermaid 均不进首屏(性能红线)。
export function MarkdownPreview({ content, themeKind }: MarkdownPreviewProps) {
  const html = useMemo(() => renderMarkdown(content), [content]);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    // 仅当文档真的含 mermaid 围栏才触发动态 import(footprint 红线)。
    if (!root.querySelector(".mermaid-block")) return;

    let cancelled = false;
    // 与文本渲染解耦的防抖:连续编辑不反复触发昂贵的 SVG 生成。
    const timer = window.setTimeout(() => {
      void renderMermaidBlocks(root, themeKind, () => cancelled).catch(
        (err) => {
          console.error("加载 mermaid 失败:", err); // 加载失败:保留源码占位,不白屏
        },
      );
    }, 200);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // themeKind 变化必须重渲染:mermaid 不支持原地改色,只能按新主题重生成 SVG。
  }, [html, themeKind]);

  return (
    <div
      ref={rootRef}
      className="md-preview h-full overflow-auto px-6 py-4 text-sm text-[var(--color-text)]"
      // html 已 DOMPurify 消毒(ADR-0002);mermaid SVG 由 effect 二次消毒后注入。
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
