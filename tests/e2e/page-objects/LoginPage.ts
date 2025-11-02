import { type Locator, type Page } from "playwright/test";

/**
 * Page Object Model for Login Page
 *
 * Encapsulates all interactions with the login page following Playwright best practices:
 * - Uses data-testid selectors for resilient element location
 * - Provides semantic methods for user actions (Arrange-Act-Assert pattern)
 * - Centralizes selectors for easy maintenance
 *
 * @see .cursor/rules/playwright-e2e-testing.mdc for E2E testing guidelines
 */
export class LoginPage {
  readonly page: Page;

  // Selectors
  readonly pageContainer: Locator;
  readonly form: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    this.page = page;

    // Initialize locators using data-testid attributes
    this.pageContainer = page.getByTestId("login-page");
    this.form = page.getByTestId("login-form");
    this.emailInput = page.getByTestId("login-form-email-input");
    this.passwordInput = page.getByTestId("login-form-password-input");
    this.submitButton = page.getByTestId("login-form-submit-button");
    this.forgotPasswordLink = page.getByTestId("login-page-forgot-password-link");
  }

  /**
   * Navigate to login page
   */
  async goto() {
    await this.page.goto("/login");
  }

  /**
   * Fill email input field
   * @param email - Email address
   */
  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  /**
   * Fill password input field
   * @param password - Password
   */
  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  /**
   * Submit login form
   */
  async submit() {
    await this.submitButton.click();
  }

  /**
   * Complete login flow with credentials
   * @param email - Email address
   * @param password - Password
   */
  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
  }

  /**
   * Click forgot password link
   */
  async clickForgotPassword() {
    await this.forgotPasswordLink.click();
  }

  /**
   * Check if login page is displayed
   * @returns True if page is visible
   */
  async isDisplayed() {
    return await this.pageContainer.isVisible();
  }

  /**
   * Check if submit button is disabled
   * @returns True if button is disabled
   */
  async isSubmitDisabled() {
    return await this.submitButton.isDisabled();
  }

  /**
   * Get submit button text
   * @returns Button text content
   */
  async getSubmitButtonText() {
    return await this.submitButton.textContent();
  }

  /**
   * Check if error message is displayed
   * @param errorText - Expected error text
   * @returns True if error is visible
   */
  async hasError(errorText: string) {
    const error = this.page.getByText(errorText);
    return await error.isVisible();
  }

  /**
   * Wait for navigation after successful login
   * Waits for URL to change to expected destination
   * @param expectedUrl - Expected URL after login (default: /notes)
   */
  async waitForSuccessfulLogin(expectedUrl = "/notes") {
    await this.page.waitForURL((url) => url.pathname === expectedUrl, {
      timeout: 10000,
    });
  }

  /**
   * Get current email input value
   * @returns Email input value
   */
  async getEmailValue() {
    return await this.emailInput.inputValue();
  }

  /**
   * Get current password input value
   * @returns Password input value
   */
  async getPasswordValue() {
    return await this.passwordInput.inputValue();
  }

  /**
   * Check if email input has error styling
   * @returns True if input has error class
   */
  async emailHasError() {
    const classes = await this.emailInput.getAttribute("class");
    return classes?.includes("border-red") || classes?.includes("error");
  }

  /**
   * Check if password input has error styling
   * @returns True if input has error class
   */
  async passwordHasError() {
    const classes = await this.passwordInput.getAttribute("class");
    return classes?.includes("border-red") || classes?.includes("error");
  }
}
