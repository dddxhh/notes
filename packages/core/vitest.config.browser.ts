import { defineConfig } from "vitest/config";
import path from "path";

const waSqliteDist = path.resolve(
  __dirname,
  "../../node_modules/.pnpm/wa-sqlite@1.0.0/node_modules/wa-sqlite/dist"
);

export default defineConfig({
  assetsInclude: ["**/*.wasm"],
  optimizeDeps: {
    exclude: ["wa-sqlite"],
  },
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
    fs: {
      allow: [waSqliteDist],
    },
  },
  test: {
    browser: {
      enabled: true,
      provider: "playwright",
      instances: [{ browser: "chromium" }],
    },
    include: ["tests/browser/**/*.test.ts"],
    setupFiles: ["./tests/setup.browser.ts"],
  },
});