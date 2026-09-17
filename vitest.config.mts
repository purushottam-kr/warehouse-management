import { defineConfig } from "vitest/config";

import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],

  test: {
    globalSetup: ["tests/integration/global-setup.ts"],

    include: ["tests/**/*.test.ts"],

    testTimeout: 60_000,

    hookTimeout: 120_000,

    teardownTimeout: 30_000,
  },
});
