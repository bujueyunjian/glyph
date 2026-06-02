import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// @ts-expect-error process 是 nodejs 全局
const host = process.env.TAURI_DEV_HOST;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // 与 tsconfig.json 的 paths "@/*" 对齐
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },

  // Tauri 专用:仅在 `tauri dev` / `tauri build` 生效
  // 1. 不让 Vite 遮蔽 Rust 报错
  clearScreen: false,
  // 2. Tauri 需要固定端口,端口被占则失败
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. 让 Vite 忽略 src-tauri
      ignored: ["**/src-tauri/**"],
    },
  },
}));
