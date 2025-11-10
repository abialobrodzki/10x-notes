import { type Locator, type Page } from "playwright/test";

/**
 * Page Object Model for Notes Page (authenticated)
 *
 * Encapsulates all interactions with the /notes page after successful login
 * Includes navbar elements visible only to authenticated users
 *
 * @see .cursor/rules/playwright-e2e-testing.mdc for E2E testing guidelines
 */
export class NotesPage {
  readonly page: Page;

  // Navbar selectors (authenticated user)
  readonly navbar: Locator;
  readonly navbarLogoLink: Locator;
  readonly navbarNotesLink: Locator;
  readonly navbarGenerateNoteButton: Locator;
  readonly navbarUserEmailDisplay: Locator;
  readonly navbarUserMenuDropdown: Locator;
  readonly navbarSettingsLink: Locator;
  readonly navbarLogoutButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Initialize navbar locators using data-testid attributes
    this.navbar = page.getByTestId("navbar");
    this.navbarLogoLink = page.getByTestId("navbar-logo-link");
    this.navbarNotesLink = page.getByTestId("navbar-notes-link");
    this.navbarGenerateNoteButton = page.getByTestId("navbar-generate-note-button");
    this.navbarUserEmailDisplay = page.getByTestId("navbar-user-email-display");
    this.navbarUserMenuDropdown = page.getByTestId("navbar-user-menu-dropdown");
    this.navbarSettingsLink = page.getByTestId("navbar-settings-link");
    this.navbarLogoutButton = page.getByTestId("navbar-logout-button");
  }

  /**
   * Navigate to notes page
   */
  async goto() {
    await this.page.goto("/notes");
  }

  /**
   * Check if notes page is displayed
   * @returns True if page is visible
   */
  async isDisplayed() {
    return await this.navbar.isVisible();
  }

  /**
   * Wait for user profile to load in navbar
   * Waits until email is displayed instead of "Ładowanie..."
   *
   * @param expectedEmail - Expected user email
   * @param timeout - Maximum wait time in ms (default: 10000)
   */
  async waitForUserProfileLoaded(expectedEmail: string, timeout = 10000) {
    await this.page.waitForFunction(
      (email) => {
        const emailDisplay = document.querySelector('[data-testid="navbar-user-email-display"]');
        return emailDisplay?.textContent?.includes(email) === true;
      },
      expectedEmail,
      { timeout }
    );
  }

  /**
   * Get displayed user email from navbar
   * @returns User email text or null
   */
  async getUserEmail() {
    return await this.navbarUserEmailDisplay.textContent();
  }

  /**
   * Check if authenticated navbar is visible
   * Verifies presence of key authenticated elements
   *
   * @returns True if authenticated UI is visible
   */
  async isAuthenticatedNavbarVisible() {
    return (
      (await this.navbarNotesLink.isVisible()) &&
      (await this.navbarGenerateNoteButton.isVisible()) &&
      (await this.navbarUserEmailDisplay.isVisible())
    );
  }

  /**
   * Navigate to settings page via navbar
   */
  async goToSettings() {
    // Open user menu dropdown first
    await this.navbarUserEmailDisplay.waitFor({ state: "visible" });
    await this.navbarUserEmailDisplay.click();
    await this.navbarSettingsLink.waitFor({ state: "visible" });
    await this.navbarSettingsLink.click();
  }

  /**
   * Logout via navbar
   */
  async logout() {
    // Open user menu dropdown first
    await this.navbarUserEmailDisplay.click();
    await this.navbarLogoutButton.click();
  }

  /**
   * Find a note in the list by its text content
   * Useful for finding notes by summary or other text content
   *
   * @param textContent - The text to search for in note items
   * @returns Locator for the note element
   */
  getNoteByText(textContent: string): Locator {
    return this.page.locator(`text=${textContent}`).first();
  }
}
