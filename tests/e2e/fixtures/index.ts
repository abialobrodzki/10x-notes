import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { test as base } from "playwright/test";
import { createTestUser, getFallbackEnvTestUser } from "../helpers/test-user.helpers";
// POM Imports
import { DeleteAccountWizardPOM } from "../page-objects/DeleteAccountWizard";
import { ForgotPasswordPage } from "../page-objects/ForgotPasswordPage";
import { LandingPage } from "../page-objects/LandingPage";
import { LoginPage } from "../page-objects/LoginPage";
import { NoteDetailPage } from "../page-objects/NoteDetailPage";
import { NotesListPage } from "../page-objects/NotesListPage";
import { NotesPage } from "../page-objects/NotesPage";
import { PublicNotePage } from "../page-objects/PublicNotePage";
import { RegisterPage } from "../page-objects/RegisterPage";
import { ResetPasswordPage } from "../page-objects/ResetPasswordPage";
import { SettingsPage } from "../page-objects/SettingsPage";
import { TagAccessModalPOM } from "../page-objects/TagAccessModal";
import type { TestUser } from "../types/test-user.types";
import type { Page } from "playwright/test";

// Fixture types
interface POMFixtures {
  loginPage: LoginPage;
  notesPage: NotesPage;
  notesListPage: NotesListPage;
  landingPage: LandingPage;
  noteDetailPage: NoteDetailPage;
  forgotPasswordPage: ForgotPasswordPage;
  registerPage: RegisterPage;
  resetPasswordPage: ResetPasswordPage;
  settingsPage: SettingsPage;
  publicNotePage: PublicNotePage;
  tagAccessModal: TagAccessModalPOM;
  deleteAccountWizard: DeleteAccountWizardPOM;
}

interface AuthenticatedPageFixture {
  page: Page;
}

interface AuthedFixtures {
  user: TestUser;
  authenticatedPage: AuthenticatedPageFixture;
}

interface AuthedWorkerFixtures {
  workerTestUser: TestUser;
  authStorageState: string;
}

// --- Unauthenticated Test --- //
// Extends the base test with all Page Object Models.
// Used for tests that do not require a logged-in user.
export const unauthedTest = base.extend<POMFixtures>({
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  notesPage: async ({ page }, use) => use(new NotesPage(page)),
  notesListPage: async ({ page }, use) => use(new NotesListPage(page)),
  landingPage: async ({ page }, use) => use(new LandingPage(page)),
  noteDetailPage: async ({ page }, use) => use(new NoteDetailPage(page)),
  forgotPasswordPage: async ({ page }, use) => use(new ForgotPasswordPage(page)),
  registerPage: async ({ page }, use) => use(new RegisterPage(page)),
  resetPasswordPage: async ({ page }, use) => use(new ResetPasswordPage(page)),
  settingsPage: async ({ page }, use) => use(new SettingsPage(page)),
  publicNotePage: async ({ page }, use) => use(new PublicNotePage(page)),
  tagAccessModal: async ({ page }, use) => use(new TagAccessModalPOM(page)),
  deleteAccountWizard: async ({ page }, use) => use(new DeleteAccountWizardPOM(page)),
});

// --- Authenticated Test --- //
// Extends the unauthenticated test to provide an auto-logged-in page.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const authDir = path.resolve(__dirname, "../.auth");
const usersFile = path.resolve(authDir, "test-users.json");

export const authedTest = unauthedTest.extend<AuthedFixtures, AuthedWorkerFixtures>({
  user: async ({ workerTestUser }, use) => {
    await use(workerTestUser);
  },

  authenticatedPage: async ({ page }, use) => {
    await use({ page });
  },

  authStorageState: [
    async ({ browser, workerTestUser }, use, workerInfo) => {
      const storageStatePath = path.resolve(authDir, `storage-worker-${workerInfo.workerIndex}.json`);
      const baseURL = workerInfo.project.use.baseURL ?? "http://localhost:3000";
      await ensureAuthStorageState({
        browser,
        user: workerTestUser,
        storageStatePath,
        baseURL,
      });
      await use(storageStatePath);
    },
    { scope: "worker" },
  ],

  page: async ({ browser, authStorageState }, use, testInfo) => {
    const baseURL = testInfo.project.use.baseURL ?? "http://localhost:3000";
    const context = await browser.newContext({
      storageState: authStorageState,
      baseURL,
    });
    const authedPageInstance = await context.newPage();
    await use(authedPageInstance);
    await context.close();
  },

  workerTestUser: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      const { user: testUser, shouldPersist } = await createOrReuseWorkerTestUser();

      if (shouldPersist) {
        try {
          await fs.mkdir(authDir, { recursive: true });
          const users = JSON.parse(await fs.readFile(usersFile, "utf-8"));
          users.push(testUser);
          await fs.writeFile(usersFile, JSON.stringify(users, null, 2));
        } catch {
          await fs.writeFile(usersFile, JSON.stringify([testUser], null, 2));
        }
      } else {
        console.warn(
          "[E2E] Using fallback E2E user from .env.test due to Supabase signup rate limits. Data isolation may be reduced."
        );
      }

      await use(testUser);
    },
    { scope: "worker" },
  ],
});

export { expect } from "playwright/test";

async function createOrReuseWorkerTestUser(): Promise<{ user: TestUser; shouldPersist: boolean }> {
  try {
    const user = await createTestUser();
    return { user, shouldPersist: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(`[E2E] Failed to create isolated Supabase user: ${errorMessage}. Trying fallback env user.`);
    try {
      const fallbackUser = await getFallbackEnvTestUser();
      return { user: fallbackUser, shouldPersist: false };
    } catch (fallbackError) {
      const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      throw new Error(
        `Unable to create test user (${errorMessage}) and fallback login failed (${fallbackMessage}). Check Supabase credentials and .env.test fallback user.`
      );
    }
  }
}

interface EnsureAuthStorageStateOptions {
  browser: import("playwright/test").Browser;
  user: TestUser;
  storageStatePath: string;
  baseURL: string;
}

async function ensureAuthStorageState({
  browser,
  user,
  storageStatePath,
  baseURL,
}: EnsureAuthStorageStateOptions): Promise<void> {
  try {
    await fs.access(storageStatePath);
    return;
  } catch {
    // File missing - continue to create it
  }

  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  await injectAstroHydrationHook(page);
  await page.goto("/login");
  await waitForPageHydration(page);
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/notes", { timeout: 20000 });
  await context.storageState({ path: storageStatePath });
  await ensureDefaultStorageState(storageStatePath);
  await context.close();
}

async function injectAstroHydrationHook(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __astroPageLoaded?: boolean }).__astroPageLoaded = false;
    window.addEventListener(
      "astro:page-load",
      () => {
        (window as unknown as { __astroPageLoaded?: boolean }).__astroPageLoaded = true;
      },
      { once: true }
    );
  });
}

async function waitForPageHydration(page: Page) {
  try {
    await page.waitForFunction(
      () => (window as unknown as { __astroPageLoaded?: boolean }).__astroPageLoaded === true,
      {
        timeout: 15000,
      }
    );
  } catch {
    // Fallback in case event did not fire for some reason
    await page.waitForTimeout(1000);
  }
}

async function ensureDefaultStorageState(sourcePath: string) {
  const defaultPath = path.resolve(authDir, "user.json");
  try {
    await fs.access(defaultPath);
    return;
  } catch {
    await fs.copyFile(sourcePath, defaultPath);
  }
}
