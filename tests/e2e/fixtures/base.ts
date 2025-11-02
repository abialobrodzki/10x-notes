import { test as base } from "playwright/test";
import { requireE2EUserCredentials, requireEnvVar } from "../helpers/env.helpers";
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

type AuthenticatedNotesPage = NotesPage & {
  user: {
    email: string;
    id: string;
  };
};

/**
 * Custom Playwright fixtures
 *
 * Extends base test with page object models and common setup
 * Follows Playwright best practices for test organization
 *
 * @example
 * ```ts
 * test('should login successfully', async ({ loginPage, notesPage }) => {
 *   await loginPage.goto();
 *   await loginPage.login('user@example.com', 'password');
 *   await notesPage.waitForUserProfileLoaded('user@example.com');
 * });
 * ```
 */

interface CustomFixtures {
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
  authenticatedPage: AuthenticatedNotesPage;
  user: { email: string; id: string };
}

/**
 * Extended test with custom fixtures
 */
export const test = base.extend<CustomFixtures>({
  /**
   * LoginPage fixture - automatically instantiated for each test
   */
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  /**
   * NoteDetailPage fixture - automatically instantiated for each test
   */
  noteDetailPage: async ({ page }, use) => {
    const noteDetailPage = new NoteDetailPage(page);
    await use(noteDetailPage);
  },

  /**
   * NotesPage fixture - automatically instantiated for each test
   */
  notesPage: async ({ page }, use) => {
    const notesPage = new NotesPage(page);
    await use(notesPage);
  },

  /**
   * NotesListPage fixture - automatically instantiated for each test
   */
  notesListPage: async ({ page }, use) => {
    const notesListPage = new NotesListPage(page);
    await use(notesListPage);
  },

  /**
   * LandingPage fixture - automatically instantiated for each test
   */
  landingPage: async ({ page }, use) => {
    const landingPage = new LandingPage(page);
    await use(landingPage);
  },

  /**
   * ForgotPasswordPage fixture - automatically instantiated for each test
   */
  forgotPasswordPage: async ({ page }, use) => {
    const forgotPasswordPage = new ForgotPasswordPage(page);
    await use(forgotPasswordPage);
  },

  /**
   * RegisterPage fixture - automatically instantiated for each test
   */
  registerPage: async ({ page }, use) => {
    const registerPage = new RegisterPage(page);
    await use(registerPage);
  },

  /**
   * ResetPasswordPage fixture - automatically instantiated for each test
   */
  resetPasswordPage: async ({ page }, use) => {
    const resetPasswordPage = new ResetPasswordPage(page);
    await use(resetPasswordPage);
  },

  /**
   * SettingsPage fixture - automatically instantiated for each test
   */
  settingsPage: async ({ page }, use) => {
    const settingsPage = new SettingsPage(page);
    await use(settingsPage);
  },

  /**
   * PublicNotePage fixture - automatically instantiated for each test
   */
  publicNotePage: async ({ page }, use) => {
    const publicNotePage = new PublicNotePage(page);
    await use(publicNotePage);
  },

  /**
   * Authenticated page fixture.
   * This fixture uses the storageState from `global.setup.ts` to provide an authenticated page.
   * It navigates to the base URL and waits for the user profile to be loaded.
   */
  authenticatedPage: async ({ page }, use) => {
    const { email } = requireE2EUserCredentials();
    const userId = requireEnvVar("E2E_USERNAME_ID");
    const baseNotesPage = new NotesPage(page);
    const authenticatedPage: AuthenticatedNotesPage = Object.assign(baseNotesPage, {
      user: {
        email,
        id: userId,
      },
    });
    await page.goto("/");
    // For some pages, we might need to wait for a specific element or API call to confirm load
    // For now, simply navigating to '/' is sufficient if the global setup handles auth.
    await use(authenticatedPage);
  },

  /**
   * User fixture - provides authenticated user details
   */
  user: async ({ authenticatedPage }, use) => {
    await use(authenticatedPage.user);
  },
});

export { expect } from "playwright/test";
