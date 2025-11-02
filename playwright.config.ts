import path from "path";
import dotenv from "dotenv";
import { defineConfig, devices } from "playwright/test";

// Load environment variables from .env.test
dotenv.config({ path: path.resolve(process.cwd(), ".env.test") });

/**
 * Playwright E2E Testing Configuration
 *
 * Uses environment-specific configuration:
 * - .env.test for test environment variables (loaded via dotenv)
 * - dev:e2e script runs Astro in test mode
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory structure
  testDir: "./tests/e2e",

  // Pattern for test files
  testMatch: "**/*.spec.ts",

  // Global setup - runs once before all tests
  globalSetup: "./tests/e2e/global.setup.ts",

  // Folder for test artifacts
  outputDir: "./tests/e2e/test-results",

  // Maximum time one test can run (30s)
  timeout: 30 * 1000,

  // Fail the build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,

  // Retry failed tests in CI only
  retries: process.env.CI ? 2 : 0,

  // Parallel execution - opt in workers for faster test runs
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: [
    // HTML report for local debugging
    ["html", { outputFolder: "./tests/e2e/playwright-report", open: "never" }],
    // List reporter for terminal output
    ["list"],
  ],

  // Shared settings for all projects
  use: {
    // Base URL for navigation (e.g., page.goto('/'))
    baseURL: "http://localhost:3000",

    // Collect trace on first retry for debugging
    trace: "on-first-retry",

    // Screenshot on failure
    screenshot: "only-on-failure",

    // Video on first retry
    video: "retain-on-failure",

    // Maximum time for actions like click(), fill() (10s)
    actionTimeout: 10 * 1000,

    // Maximum time for navigation (30s)
    navigationTimeout: 30 * 1000,
  },

  // Configure projects for different browsers
  // Following Playwright guidelines: initialize with Chromium only
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Use headless mode in CI
        headless: !!process.env.CI,
      },
    },
  ],

  // Web Server configuration - run dev:e2e before tests
  webServer: {
    command: "npm run dev:e2e",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes to start server
    stdout: "ignore",
    stderr: "pipe",
    // Pass environment variables to dev server
    env: {
      PUBLIC_SUPABASE_URL: process.env.PUBLIC_SUPABASE_URL || "",
      PUBLIC_SUPABASE_KEY: process.env.PUBLIC_SUPABASE_KEY || "",
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || "",
      E2E_USERNAME: process.env.E2E_USERNAME || "",
      E2E_PASSWORD: process.env.E2E_PASSWORD || "",
      E2E_USERNAME_ID: process.env.E2E_USERNAME_ID || "",
    },
  },
});
