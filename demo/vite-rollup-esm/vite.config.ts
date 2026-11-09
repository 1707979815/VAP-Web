import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

/**
 * @file vite.config.ts
 * @description 展示仓的 demo 构建配置。`custom-vap` 直接取自 npm registry（package.json 依赖），
 * 不含库源码，因此这里不再配置指向 `../../src` 的 alias。
 */
export default defineConfig({
  plugins: [vue()],
  // 相对 base：构建产物可部署到任意子路径（GitHub Pages 项目页即 /VAP-Web/）
  base: "./",
  server: {
    port: 5173,
    open: false,
  },
  build: {
    outDir: "dist",
    target: "es2018",
  },
});
