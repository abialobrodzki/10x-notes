import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { test as setup } from "playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(process.cwd(), ".env.test") });

const authFile = path.resolve(__dirname, "../.auth/user.json");

setup("prepare login project", async ({ baseURL, page }) => {
  // Ensure we can reach the dev server
  const targetBaseURL = baseURL ?? "http://localhost:3000";
  await page.goto(targetBaseURL, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  await page.context().clearCookies();

  // Remove any persisted auth state so login specs always start fresh
  await fs.rm(authFile, { force: true });
});
