import { defineConfig } from "vitest/config";

// Live smoke tests against the real simap API (`npm run test:live`).
// Kept out of `vitest.config.ts` so `npm test` never needs the network.
export default defineConfig({
  test: {
    include: ["tests/live/**/*.live.test.ts"],
    // One slow upstream answer plus two retries must fit.
    testTimeout: 90_000,
    hookTimeout: 30_000,
    // Tests share one server, and the tender tests feed each other.
    fileParallelism: false,
  },
});
