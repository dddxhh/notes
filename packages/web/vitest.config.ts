import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@notes/core": resolve(__dirname, "../core/src/index.ts"),
    },
  },
  test: {
    environment: "happy-dom",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
});