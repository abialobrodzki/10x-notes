import type { Locator, Page } from "playwright/test";

export class RegisterPage {
  readonly page: Page;
  readonly container: Locator;
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
    await this.emailInput.waitFor({ state: "visible" });
    await this.emailInput.fill("");
    await this.emailInput.type(email, { delay: 20 });
    await this.page.waitForFunction(
      (expectedEmail) => {
        const input = document.querySelector('[data-testid="register-form-email-input"]') as HTMLInputElement;
        return input?.value === expectedEmail;
      },
      email,
      { timeout: 5000 }
    );
  }

  async fillPassword(password: string) {
    await this.passwordInput.waitFor({ state: "visible" });
    await this.passwordInput.fill("");
    await this.passwordInput.type(password, { delay: 20 });
    await this.page.waitForFunction(
      (expectedPassword) => {
        const input = document.querySelector('[data-testid="register-form-password-input"]') as HTMLInputElement;
        return input?.value === expectedPassword;
      },
      password,
      { timeout: 5000 }
    );
  }

  async fillConfirmPassword(confirmPassword: string) {
    await this.confirmPasswordInput.waitFor({ state: "visible" });
    await this.confirmPasswordInput.fill("");
    await this.confirmPasswordInput.type(confirmPassword, { delay: 20 });
    await this.page.waitForFunction(
      (expectedPassword) => {
        const input = document.querySelector(
          '[data-testid="register-form-confirm-password-input"]'
        ) as HTMLInputElement;
        return input?.value === expectedPassword;
      },
      confirmPassword,
      { timeout: 5000 }
    );
  }

  async submitForm() {
    await this.submitButton.waitFor({ state: "visible" });
    const responsePromise = this.page
      .waitForResponse((response) => response.url().includes("/api/auth/register"), { timeout: 10000 })
      .catch(() => undefined);

    await this.submitButton.click();

    await Promise.race([responsePromise, this.page.waitForTimeout(1500)]);

    await Promise.race([
      this.waitForAlert().catch(() => undefined),
      this.page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => undefined),
    ]);

    await this.page.waitForTimeout(150);
  }

  async getErrorMessageText() {
    await this.errorMessage.waitFor({ state: "visible", timeout: 5000 });
    await this.page.waitForTimeout(100);
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
}
