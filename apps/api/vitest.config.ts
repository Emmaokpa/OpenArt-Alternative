import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    restoreMocks: true,
    globalSetup: ["src/test-utils/global-setup.ts"],
    // Database suites share one test database; running files in parallel would
    // let one file truncate another's fixtures.
    fileParallelism: false,
  },
});
