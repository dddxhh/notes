import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "icons/*.png"],
      manifest: {
        name: "笔记",
        short_name: "笔记",
        start_url: "/",
        display: "standalone",
        background_color: "#fafafa",
        theme_color: "#3b82f6",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,wasm}"],
        navigateFallback: "index.html",
      },
    }),
  ],
  resolve: {
    alias: {
      "@notes/core": resolve(__dirname, "../core/src/index.ts"),
    },
  },
  assetsInclude: ["**/*.wasm"],
  optimizeDeps: {
    exclude: ["wa-sqlite"],
  },
  server: {
    port: 3000,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
});
