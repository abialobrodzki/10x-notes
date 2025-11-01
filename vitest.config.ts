import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Use happy-dom for faster DOM emulation (lighter than jsdom)
    environment: "node",

    // Global test setup
    setupFiles: ["./tests/setup.ts"],

    // Enable global test APIs (describe, it, expect, etc.)
    globals: true,

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/",
        "tests/",
        "dist/",
        "**/*.config.*",
        "**/*.d.ts",
        "**/types.ts",
        "src/db/database.types.ts", // Auto-generated Supabase types
      ],
      thresholds: {
        // Global thresholds (as per test-plan.md)
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },

    // Test file patterns
    include: ["tests/**/*.test.ts"],

    // Watch mode settings
    watch: false,
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "astro:middleware": path.resolve(__dirname, "./tests/__mocks__/astro-middleware.ts"),
    },
  },
});
