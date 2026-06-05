// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { renderMarkdown } from "@/features/markdown/render";

describe("renderMarkdown", () => {
  it("渲染基础 Markdown(标题/加粗)", () => {
    const html = renderMarkdown("# Title\n\n**bold**");
    expect(html).toContain("Title");
    expect(html).toContain("<strong>bold</strong>");
  });

  it("支持 GFM 删除线", () => {
    expect(renderMarkdown("~~gone~~")).toContain("<del>");
  });

  it("消毒 <script> 标签与内容(XSS)", () => {
    const html = renderMarkdown("<script>alert(1)</script>\n\nsafe");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("alert(1)");
    expect(html).toContain("safe");
  });

  it("消毒事件属性 onerror(XSS)", () => {
    const html = renderMarkdown('<img src="x" onerror="alert(1)">');
    expect(html).not.toContain("onerror");
  });

  it("消毒 javascript: 协议链接(XSS)", () => {
    const html = renderMarkdown("[x](javascript:alert(1))");
    expect(html).not.toMatch(/href="javascript:/i);
  });

  it("mermaid 围栏 → 惰性占位符(不在此渲染 SVG,源码转义保留)", () => {
    const html = renderMarkdown("```mermaid\nflowchart TD\n A-->B\n```");
    expect(html).toContain('class="mermaid-block"');
    expect(html).toContain("data-mermaid-hash=");
    expect(html).toContain("flowchart TD");
    expect(html).not.toContain("<svg"); // 渲染推迟到预览 effect,这里不出 SVG
  });

  it("非 mermaid 代码块仍走默认渲染", () => {
    const html = renderMarkdown("```js\nconst a = 1;\n```");
    expect(html).toContain("<code");
    expect(html).not.toContain("mermaid-block");
  });
});
