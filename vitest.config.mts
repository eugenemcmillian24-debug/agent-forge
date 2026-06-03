import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["**/__tests__/**/*.test.ts"],
    exclude: ["node_modules", ".next", ".open-next"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: [
        "lib/agents/orchestrator.ts",
        "lib/ai/provider-router.ts",
        "lib/utils/rate-limit.ts",
        "lib/rate-limit.ts",
        "lib/agents/repair.ts",
        "lib/agents/qa.ts",
        "lib/utils/crypto.ts",
      ],
    },
  },
});
