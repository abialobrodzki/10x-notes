import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { test as setup } from "playwright/test";
import { createTestUser } from "../helpers/test-user.helpers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const authDir = path.resolve(__dirname, "../.auth");
const usersFile = path.resolve(authDir, "test-users.json");

setup("authenticate test user", async ({ page }) => {
  const workerIndex = process.env.PLAYWRIGHT_WORKER_INDEX;
  if (workerIndex === undefined) {
    throw new Error("PLAYWRIGHT_WORKER_INDEX environment variable is not set.");
  }

  const authFile = path.resolve(authDir, `user-${workerIndex}.json`);

  // Create auth directory if it doesn't exist
  await fs.mkdir(authDir, { recursive: true });

  // Create a new unique user for this worker
  const testUser = await createTestUser();

  // Store user details for global teardown
  try {
    const users = JSON.parse(await fs.readFile(usersFile, "utf-8"));
    users.push(testUser);
    await fs.writeFile(usersFile, JSON.stringify(users, null, 2));
  } catch {
    // File might not exist on first run
    await fs.writeFile(usersFile, JSON.stringify([testUser], null, 2));
  }

  // Perform login
  await page.goto("/login");
  await page.fill('input[name="email"]', testUser.email);
  await page.fill('input[name="password"]', testUser.password);
  await page.click('button[type="submit"]');

  // Wait for successful login and redirection
  await page.waitForURL("**/notes");

  // Verify login by checking for the user's email in the navbar
  await page.waitForFunction(
    (email) => {
      const emailDisplay = document.querySelector('[data-testid="navbar-user-email-display"]');
      return emailDisplay?.textContent === email;
    },
    testUser.email,
    { timeout: 10000 }
  );

  // Save authentication state
  await page.context().storageState({ path: authFile });
});
