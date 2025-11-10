import { expect, type Locator, type Page } from "playwright/test";

/**
 * Page Object Model for Landing Page (/)
 *
 * Handles anonymous AI generation UI state and validation messages.
 */
export class LandingPage {
  readonly page: Page;
  #hydrationHookInstalled = false;

  readonly container: Locator;
  readonly contentArea: Locator;
  readonly textarea: Locator;
  readonly generateButton: Locator;
  readonly errorMessage: Locator;
  readonly retryButton: Locator;
  readonly charCounter: Locator;
  readonly limitWarning: Locator;
  readonly limitReachedMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    this.container = page.getByTestId("landing-page");
    this.contentArea = page.getByTestId("landing-page-content-area");
    this.textarea = page.getByTestId("char-count-textarea-input");
    this.generateButton = page.getByTestId("landing-page-generate-button");
    this.errorMessage = page.getByTestId("generation-error");
    this.retryButton = page.getByTestId("generation-error-retry-button");
    this.charCounter = page.getByTestId("char-count-textarea-counter");
    this.limitWarning = page.getByTestId("char-count-textarea-warning-message");
    this.limitReachedMessage = page.getByTestId("char-count-textarea-limit-reached-message");
  }

  async goto() {
    await this.ensureHydrationHook();
    await this.page.goto("/", { waitUntil: "domcontentloaded" });
    await this.waitForHydration();
    await this.container.waitFor({ state: "visible" });
    await this.contentArea.waitFor({ state: "visible" });
    await this.charCounter.waitFor({ state: "visible" });
  }

  async fillInput(value: string) {
    await expect(this.textarea).toBeVisible();
    await this.textarea.click();

    await this.textarea.clear();
    await this.textarea.fill(value);
    await expect(this.textarea).toHaveValue(value);
  }

  async clickGenerate() {
    await this.generateButton.waitFor({ state: "visible" });
    await this.generateButton.click();
  }

  private async ensureHydrationHook() {
    if (this.#hydrationHookInstalled) return;
    await this.page.addInitScript(() => {
      const globalWindow = window as unknown as { __landingHydrated?: boolean };
      globalWindow.__landingHydrated = false;
      window.addEventListener(
        "astro:page-load",
        () => {
          globalWindow.__landingHydrated = true;
        },
        { once: true }
      );
    });
    this.#hydrationHookInstalled = true;
  }

  private async waitForHydration() {
    try {
      await this.page.waitForFunction(
        () => (window as unknown as { __landingHydrated?: boolean }).__landingHydrated === true,
        {},
        { timeout: 15000 }
      );
    } catch {
      // In case the event was missed, give Astro a moment to finish hydrating.
      await this.page.waitForTimeout(1000);
    }
  }
}
