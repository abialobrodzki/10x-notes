import type { Locator, Page } from "playwright/test";

export class ForgotPasswordPage {
  readonly page: Page;
  readonly container: Locator;
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
    this.emailInput = page.getByTestId("forgot-password-form-email-input");
    this.submitButton = page.getByTestId("forgot-password-form-submit-button");
    this.alerts = page.locator('[data-testid^="alert-area-"]');
    this.successMessage = page.getByTestId("alert-area-success");
    this.errorMessage = page.getByTestId("alert-area-error");
    this.returnToLoginLink = page.getByTestId("forgot-password-page-return-to-login-link");
    this.returnToLoginSuccessLink = page.getByTestId("forgot-password-page-return-to-login-link-success");
  }

  async goto() {
    // Clear any previous route handlers to avoid mock interference
    await this.page.unroute("**/api/auth/**");

    await this.page.context().clearCookies();
    await this.page.goto("/forgot-password", { waitUntil: "domcontentloaded" });
    await this.container.waitFor({ state: "visible" });
    await this.emailInput.waitFor({ state: "visible" });
  }

  async fillEmail(email: string) {
    await this.emailInput.waitFor({ state: "visible" });

    await this.emailInput.fill("");

    await this.emailInput.type(email, { delay: 25 });

    await this.page.waitForFunction(
      (expectedEmail) => {
        const input = document.querySelector('[data-testid="forgot-password-form-email-input"]') as HTMLInputElement;
        return input?.value === expectedEmail;
      },
      email,
      { timeout: 5000 }
    );
  }

  async submitForm() {
    await this.submitButton.waitFor({ state: "visible" });

    const responsePromise = this.page
      .waitForResponse((response) => response.url().includes("/api/auth/forgot-password"), { timeout: 10000 })
      .catch(() => undefined);

    await this.submitButton.click();

    await Promise.race([responsePromise, this.page.waitForTimeout(1500)]);

    await this.waitForAlert();

    await this.page.waitForTimeout(150);
  }

  async getErrorMessageText() {
    await this.errorMessage.waitFor({ state: "visible", timeout: 15000 });
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
