import { createRoot } from "react-dom/client";

import { MarkdownPreview } from "@/components/editor/MarkdownPreview";
import "@/styles.css";

// 仅用于本地 + Playwright 视觉验证 MarkdownPreview(含 mermaid 按需渲染),不进产品包。
const sample = `# Mermaid 验证

普通段落,带 **粗体**、*斜体*、~~删除线~~ 和 \`行内代码\`。

\`\`\`mermaid
flowchart TD
  A[开始] --> B{判断}
  B -->|是| C[执行操作]
  B -->|否| D[结束]
  C --> D
\`\`\`

下面是普通代码块(不应被当作图):

\`\`\`js
const a = 1;
\`\`\`
`;

createRoot(document.getElementById("app")!).render(
  <div style={{ height: "100vh" }}>
    <MarkdownPreview content={sample} themeKind="dark" />
  </div>,
);
