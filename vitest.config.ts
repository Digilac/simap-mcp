import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Not the default `**/*.test.ts`, which also finds nested agent worktrees.
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      reporter: ["text", "html"],
      // Floor, not target: a little under the measured values (81 / 72 / 88 /
      // 81), so a real drop fails while a small difference between Node
      // versions does not. Raise them when coverage rises.
      thresholds: { statements: 79, branches: 70, functions: 85, lines: 79 },
    },
  },
});
