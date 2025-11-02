import type { Locator, Page } from "playwright/test";

export class ResetPasswordPage {
  readonly page: Page;
  readonly container: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;
  readonly goToLoginButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.getByTestId("reset-password-page");
    this.passwordInput = page.getByTestId("reset-password-form-password-input");
    this.confirmPasswordInput = page.getByTestId("reset-password-form-confirm-password-input");
    this.submitButton = page.getByTestId("reset-password-form-submit-button");
    this.errorMessage = page.getByTestId("alert-area-error");
    this.successMessage = page.getByText("Hasło zostało zmienione pomyślnie!");
    this.goToLoginButton = page.getByTestId("reset-password-form-submit-button");
  }

  async goto(token = "mock-token") {
    await this.page.context().clearCookies();
    await this.page.goto(`/reset-password?token=${token}&type=recovery`, {
      waitUntil: "domcontentloaded",
    });
    await this.container.waitFor({ state: "visible" });
    await this.passwordInput.waitFor({ state: "visible" });
  }

  async fillPassword(password: string) {
    await this.passwordInput.waitFor({ state: "visible" });
    await this.passwordInput.clear();
    await this.passwordInput.fill(password);
    // Wait for value to be properly set
    await this.page.waitForFunction(
      (expectedPassword) => {
        const input = document.querySelector('[data-testid="reset-password-form-password-input"]') as HTMLInputElement;
        return input && input.value === expectedPassword;
      },
      password,
      { timeout: 5000 }
    );
  }

  async fillConfirmPassword(confirmPassword: string) {
    await this.confirmPasswordInput.waitFor({ state: "visible" });
    await this.confirmPasswordInput.clear();
    await this.confirmPasswordInput.fill(confirmPassword);
    // Wait for value to be properly set
    await this.page.waitForFunction(
      (expectedPassword) => {
        const input = document.querySelector(
          '[data-testid="reset-password-form-confirm-password-input"]'
        ) as HTMLInputElement;
        return input && input.value === expectedPassword;
      },
      confirmPassword,
      { timeout: 5000 }
    );
  }

  async submitForm() {
    await this.submitButton.waitFor({ state: "visible" });
    await this.submitButton.click();

    // Wait for either error message or success
    await Promise.race([
      this.errorMessage.waitFor({ state: "visible", timeout: 5000 }).catch(() => undefined),
      this.successMessage.waitFor({ state: "visible", timeout: 5000 }).catch(() => undefined),
      this.page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => undefined),
    ]);

    // Give form time to stabilize
    await this.page.waitForTimeout(100);
  }

  async getErrorMessageText() {
    // Wait for error message to be visible with longer timeout
    await this.errorMessage.waitFor({ state: "visible", timeout: 5000 });
    await this.page.waitForTimeout(100);
    return this.errorMessage.textContent();
  }
}
