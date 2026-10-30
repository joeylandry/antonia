import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      // Throws outside React Server Components; tests call server modules directly.
      "server-only": fileURLToPath(new URL("./tests/support/empty.ts", import.meta.url)),
    },
  },
  // Database tests share one database and empty it between tests, so files run one at a time.
  test: { include: ["tests/**/*.test.ts"], environment: "node", fileParallelism: false },
});
