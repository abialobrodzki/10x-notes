import { type Locator, type Page } from "playwright/test";

/**
 * Page Object Model for Landing Page (/)
 *
 * Handles anonymous AI generation UI state and validation messages.
 */
export class LandingPage {
  readonly page: Page;

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
    this.errorMessage = page.getByTestId("landing-page-error-message");
    this.retryButton = page.getByTestId("landing-page-retry-button");
    this.charCounter = page.getByTestId("char-count-textarea-counter");
    this.limitWarning = page.getByTestId("char-count-textarea-warning-message");
    this.limitReachedMessage = page.getByTestId("char-count-textarea-limit-reached-message");
  }

  async goto() {
    await this.page.goto("/", { waitUntil: "domcontentloaded" });
    await this.container.waitFor({ state: "visible" });
    await this.contentArea.waitFor({ state: "visible" });
    await this.charCounter.waitFor({ state: "visible" });
  }

  async fillInput(value: string) {
    await this.textarea.waitFor({ state: "visible" });

    await this.textarea.click();

    await this.textarea.fill("");
    await this.textarea.fill(value);
    await this.textarea.dispatchEvent("change");
    await this.textarea.dispatchEvent("blur");
  }

  async clickGenerate() {
    await this.generateButton.waitFor({ state: "visible" });
    await this.generateButton.click();
  }
}
