import { expect, type Locator, type Page } from "playwright/test";

export class ForgotPasswordPage {
  readonly page: Page;
  readonly container: Locator;
  readonly form: Locator;
  readonly emailInput: Locator;
  readonly submitButton: Locator;
  readonly alerts: Locator;
  readonly successMessage: Locator;
  readonly errorMessage: Locator;
  readonly returnToLoginLink: Locator;
  readonly returnToLoginSuccessLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.getByTestId("forgot-password-page");
    this.form = page.getByTestId("forgot-password-form");
    this.emailInput = page.getByTestId("forgot-password-form-email-input");
    this.submitButton = page.getByTestId("forgot-password-form-submit-button");
    this.alerts = page.locator('[data-testid^="alert-area-"]');
    this.successMessage = page.getByTestId("alert-area-success");
    this.errorMessage = page.getByTestId("alert-area-error");
    this.returnToLoginLink = page.getByTestId("forgot-password-page-return-to-login-link");
    this.returnToLoginSuccessLink = page.getByTestId("forgot-password-page-return-to-login-link-success");
  }

  async goto() {
    await this.page.unroute("**/api/auth/**");
    await this.page.context().clearCookies();
    await this.page.goto("/forgot-password", { waitUntil: "domcontentloaded" });
    await this.container.waitFor({ state: "visible" });
    await this.emailInput.waitFor({ state: "visible" });
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email);
    await expect(this.emailInput).toHaveValue(email);
  }

  async submitForm() {
    await this.submitButton.click();
  }

  async getErrorMessageText() {
    await this.errorMessage.waitFor({ state: "visible", timeout: 15000 });
    const text = await this.errorMessage.textContent();
    return text?.trim() ?? "";
  }

  async waitForAlert(timeout = 8000) {
    await this.alerts.first().waitFor({ state: "attached", timeout });
  }

  async getEmailErrorText() {
    const errorElement = this.form.locator("div").filter({ has: this.emailInput }).locator("p.text-destructive");
    return errorElement.textContent();
  }

  async hasEmailError() {
    const errorText = await this.getEmailErrorText();
    return errorText !== null && errorText.trim().length > 0;
  }
}
