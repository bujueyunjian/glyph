import { useMemo } from "react";

import { renderMarkdown } from "@/features/markdown/render";

interface MarkdownPreviewProps {
  content: string;
}

// Markdown 预览(按需分屏,ADR-0002 v1)。内容经 renderMarkdown(marked + DOMPurify 消毒)。
// 本组件经 React.lazy 加载,故 marked/dompurify 不进首屏(性能红线)。
export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  const html = useMemo(() => renderMarkdown(content), [content]);
  return (
    <div
      className="md-preview h-full overflow-auto px-6 py-4 text-sm text-[var(--color-text)]"
      // html 已经 DOMPurify 消毒,安全注入(ADR-0002 安全红线)。
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
