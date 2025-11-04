import path from "path";
import dotenv from "dotenv";
import { defineConfig, devices } from "playwright/test";

// Load environment variables from .env.test
dotenv.config({ path: path.resolve(process.cwd(), ".env.test") });

/**
 * Playwright E2E Testing Configuration
 *
 * Uses setup projects to prime authentication state for application specs
 * while keeping login specs isolated with their own preparation step.
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory structure
  testDir: "./tests/e2e",

  // Pattern for test files
  testMatch: "**/*.spec.ts",

  // Folder for test artifacts
  outputDir: "./tests/e2e/test-results",

  // Maximum time one test can run (30s)
  timeout: 30 * 1000,

  // Fail the build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,

  // Retry failed tests in CI only
  retries: process.env.CI ? 2 : 0,

  // Parallel execution - opt in workers for faster test runs
  workers: process.env.CI ? 2 : 2,

  // Reporter configuration
  reporter: [["html", { outputFolder: "./tests/e2e/playwright-report", open: "never" }], ["list"]],

  // Shared settings for all projects
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10 * 1000,
    navigationTimeout: 30 * 1000,
  },

  projects: [
    {
      name: "setup-auth",
      testMatch: ["**/setup/auth.setup.ts"],
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        headless: process.env.PLAYWRIGHT_HEADLESS !== "false",
        storageState: "./tests/e2e/.auth/user.json",
      },
      dependencies: ["setup-auth"],
      testIgnore: [
        "**/login.spec.ts",
        "**/register.spec.ts",
        "**/forgot-password.spec.ts",
        "**/reset-password.spec.ts",
        "**/landing.spec.ts",
      ],
    },
    {
      name: "setup-login",
      testMatch: ["**/setup/login.setup.ts"],
    },
    {
      name: "chromium-login",
      use: {
        ...devices["Desktop Chrome"],
        headless: process.env.PLAYWRIGHT_HEADLESS !== "false",
        storageState: undefined,
      },
      dependencies: ["setup-login"],
      testMatch: [
        "**/login.spec.ts",
        "**/register.spec.ts",
        "**/forgot-password.spec.ts",
        "**/reset-password.spec.ts",
        "**/landing.spec.ts",
      ],
    },
  ],

  // Web Server configuration - run dev:e2e before tests
  webServer: {
    command: "npm run dev:e2e",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: "ignore",
    stderr: "pipe",
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
