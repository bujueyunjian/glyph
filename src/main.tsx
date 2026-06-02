import React from "react";
import ReactDOM from "react-dom/client";

// 只引 wght 轴(去掉 italic 轴的额外 woff2);各 latin/cyrillic 子集由 fontsource
// 用 unicode-range 分面,浏览器运行时只按需下载(实际只取 latin),无需手动裁子集。
import "@fontsource-variable/geist/wght.css";
import "@fontsource-variable/geist-mono/wght.css";
import "./styles.css";
import "./i18n";

import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
