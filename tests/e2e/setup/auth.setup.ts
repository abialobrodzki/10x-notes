import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { test as setup } from "playwright/test";
import { requireEnvVars, requireE2EUserCredentials } from "../helpers/env.helpers";
import { LoginPage } from "../page-objects/LoginPage";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure test env variables are available during setup execution
dotenv.config({ path: path.resolve(process.cwd(), ".env.test") });

const authFile = path.resolve(__dirname, "../.auth/user.json");
const REQUIRED_ENV_VARS = ["E2E_USERNAME", "E2E_PASSWORD", "PUBLIC_SUPABASE_URL", "PUBLIC_SUPABASE_KEY"] as const;

setup("authenticate test user", async ({ page }) => {
  requireEnvVars(REQUIRED_ENV_VARS);
  const { email: username, password } = requireE2EUserCredentials();

  // Ensure auth directory exists
  await fs.mkdir(path.dirname(authFile), { recursive: true });

  // Clear any stale auth state before logging in
  await fs.rm(authFile, { force: true });

  // Ensure we start from a clean auth state (no lingering cookies)
  await page.context().clearCookies();

  // Open login page and authenticate using shared page object
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await page.waitForLoadState("networkidle");
  await loginPage.fillEmail(username);
  await loginPage.fillPassword(password);
  await loginPage.submit();

  // Wait for redirect to /notes
  await page.waitForURL((url) => url.pathname === "/notes", { timeout: 30_000 });

  // Wait until navbar displays authenticated email
  await page.waitForFunction(
    (email) => {
      const emailDisplay = document.querySelector('[data-testid="navbar-user-email-display"]');
      return emailDisplay?.textContent?.includes(email) === true;
    },
    username,
    { timeout: 10_000 }
  );

  // Persist storage state for dependent projects
  await page.context().storageState({ path: authFile });

  // Cleanup: Clear any test-specific data to prevent polluting the storage state
  // This ensures clean state for dependent tests
  await page.evaluate(() => {
    // Remove any test-specific items from localStorage
    const keys = Array.from(Object.keys(localStorage));
    keys.forEach((key) => {
      if (key.includes("test") || key.includes("pending")) {
        localStorage.removeItem(key);
      }
    });
  });
});
