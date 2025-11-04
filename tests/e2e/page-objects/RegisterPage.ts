import { expect, type Locator, type Page } from "playwright/test";

export class RegisterPage {
  readonly page: Page;
  readonly container: Locator;
  readonly form: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;
  readonly alerts: Locator;
  readonly errorMessage: Locator;
  readonly signInLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.getByTestId("register-page");
    this.form = page.getByTestId("register-form");
    this.emailInput = page.getByTestId("register-form-email-input");
    this.passwordInput = page.getByTestId("register-form-password-input");
    this.confirmPasswordInput = page.getByTestId("register-form-confirm-password-input");
    this.submitButton = page.getByTestId("register-form-submit-button");
    this.alerts = page.locator('[data-testid^="alert-area-"]');
    this.errorMessage = page.getByTestId("alert-area-error");
    this.signInLink = page.getByTestId("register-page-signin-link");
  }

  async goto() {
    // Clear any previous route handlers to avoid mock interference
    await this.page.unroute("**/api/auth/**");

    await this.page.goto("/register", { waitUntil: "domcontentloaded" });
    await this.container.waitFor({ state: "visible" });
    await this.emailInput.waitFor({ state: "visible" });
  }

  async fillEmail(email: string) {
    await expect(this.emailInput).toBeVisible();
    await this.emailInput.clear();
    await this.emailInput.fill(email);
    await expect(this.emailInput).toHaveValue(email);
  }

  async fillPassword(password: string) {
    await expect(this.passwordInput).toBeVisible();
    await this.passwordInput.clear();
    await this.passwordInput.fill(password);
    await expect(this.passwordInput).toHaveValue(password);
  }

  async fillConfirmPassword(confirmPassword: string) {
    await expect(this.confirmPasswordInput).toBeVisible();
    await this.confirmPasswordInput.clear();
    await this.confirmPasswordInput.fill(confirmPassword);
    await expect(this.confirmPasswordInput).toHaveValue(confirmPassword);
  }

  async submitForm() {
    await expect(this.submitButton).toBeVisible();
    await expect(this.submitButton).toBeEnabled();
    const responsePromise = this.page
      .waitForResponse((response) => response.url().includes("/api/auth/register"), { timeout: 10000 })
      .catch(() => undefined);

    await this.submitButton.click();

    await Promise.race([responsePromise, this.page.waitForTimeout(1500)]);

    // Wait for either field-level errors or successful redirect
    await Promise.race([
      this.page
        .waitForFunction(() => Boolean(document.querySelector("p.text-destructive")), undefined, { timeout: 3000 })
        .catch(() => undefined),
      this.page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => undefined),
    ]);

    await this.page.waitForTimeout(150);
  }

  async getErrorMessageText() {
    await expect(this.errorMessage).toBeVisible();
    const text = await this.errorMessage.textContent();
    return text?.trim() ?? "";
  }

  async waitForAlert(timeout = 8000) {
    await this.alerts
      .first()
      .waitFor({ state: "attached", timeout })
      .catch(async () => {
        await this.page.waitForFunction(
          () =>
            Boolean(document.querySelector('[data-testid="alert-area-success"]')) ||
            Boolean(document.querySelector('[data-testid="alert-area-error"]')),
          undefined,
          { timeout }
        );
      });
  }

  /**
   * Get email field error message
   * @returns Error message text or null if no error
   */
  async getEmailErrorText() {
    // Error is rendered as <p> after the email input within the same div
    const errorElement = this.form.locator("div").filter({ has: this.emailInput }).locator("p.text-destructive");
    try {
      return await errorElement.textContent();
    } catch {
      return null;
    }
  }

  /**
   * Get password field error message
   * @returns Error message text or null if no error
   */
  async getPasswordErrorText() {
    // Error is rendered as <p> after the password input within the same div
    const errorElement = this.form.locator("div").filter({ has: this.passwordInput }).locator("p.text-destructive");
    try {
      return await errorElement.textContent();
    } catch {
      return null;
    }
  }

  /**
   * Get confirm password field error message
   * @returns Error message text or null if no error
   */
  async getConfirmPasswordErrorText() {
    // Error is rendered as <p> after the confirm password input within the same div
    const errorElement = this.form
      .locator("div")
      .filter({ has: this.confirmPasswordInput })
      .locator("p.text-destructive");
    try {
      return await errorElement.textContent();
    } catch {
      return null;
    }
  }

  /**
   * Check if email error is visible
   * @returns True if email error message is displayed
   */
  async hasEmailError() {
    const errorText = await this.getEmailErrorText();
    return errorText !== null && errorText.trim().length > 0;
  }

  /**
   * Check if password error is visible
   * @returns True if password error message is displayed
   */
  async hasPasswordError() {
    const errorText = await this.getPasswordErrorText();
    return errorText !== null && errorText.trim().length > 0;
  }

  /**
   * Check if confirm password error is visible
   * @returns True if confirm password error message is displayed
   */
  async hasConfirmPasswordError() {
    const errorText = await this.getConfirmPasswordErrorText();
    return errorText !== null && errorText.trim().length > 0;
  }
}
