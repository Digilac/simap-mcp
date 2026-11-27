import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      reporter: ["text", "html"],
      // Floor, not target: set just under the measured values so coverage
      // cannot drop unnoticed. Raise them when coverage rises.
      thresholds: { statements: 67, branches: 61, functions: 78, lines: 66 },
    },
  },
});
