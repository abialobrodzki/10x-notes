import { test as base } from "playwright/test";
import { LoginPage } from "../page-objects/LoginPage";
import { NotesListPage } from "../page-objects/NotesListPage";
import { NotesPage } from "../page-objects/NotesPage";

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
});

export { expect } from "playwright/test";
