import { test as base } from "playwright/test";
import { requireE2EUserCredentials, requireEnvVar } from "../helpers/env.helpers";
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
  tagAccessModal: TagAccessModalPOM;
  deleteAccountWizard: DeleteAccountWizardPOM;
  authenticatedPage: AuthenticatedNotesPage;
  user: { email: string; id: string };
}

/**
 * Extended test with custom fixtures
 */
export const test = base.extend<CustomFixtures>({
  /**
   * LoginPage fixture - automatically instantiated for each test
   * Cleans up auth state after each test to prevent cookie pollution
   */
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
    // Cleanup: Clear cookies after login tests
    await page.context().clearCookies();
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
   * Cleans up auth state after each test to prevent cookie pollution
   */
  registerPage: async ({ page }, use) => {
    const registerPage = new RegisterPage(page);
    await use(registerPage);
    // Cleanup: Clear cookies after registration tests
    await page.context().clearCookies();
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
   * TagAccessModal fixture - automatically instantiated for each test
   */
  tagAccessModal: async ({ page }, use) => {
    const tagAccessModal = new TagAccessModalPOM(page);
    await use(tagAccessModal);
  },

  /**
   * DeleteAccountWizard fixture - automatically instantiated for each test
   */
  deleteAccountWizard: async ({ page }, use) => {
    const deleteAccountWizard = new DeleteAccountWizardPOM(page);
    await use(deleteAccountWizard);
  },

  /**
   * Authenticated page fixture.
   * This fixture uses the storageState from `global.setup.ts` to provide an authenticated page.
   * It navigates to the base URL and waits for the user profile to be loaded.
   * Cleans up auth state after test to prevent pollution of subsequent tests.
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

    // Cleanup: Clear cookies and storage after test to prevent affecting other tests
    // This is important because modified auth state can persist and break subsequent tests
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  },

  /**
   * User fixture - provides authenticated user details
   */
  user: async ({ authenticatedPage }, use) => {
    await use(authenticatedPage.user);
  },
});

export { expect } from "playwright/test";
