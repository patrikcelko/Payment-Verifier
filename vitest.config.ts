import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "payment_verifier/static/ts"),
    },
  },
  test: {
    environment: "jsdom",
    include: ["tests/static/**/*.test.ts"],
    globals: true,
    setupFiles: ["tests/static/setup.ts"],
    restoreMocks: true,
    coverage: {
      include: ["payment_verifier/static/ts/**"],
      exclude: ["Proxy-Manager/**"],
    },
  },
});
