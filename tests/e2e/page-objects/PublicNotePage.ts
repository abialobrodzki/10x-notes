import type { Locator, Page } from "playwright/test";

export class PublicNotePage {
  readonly page: Page;
  readonly publicNotePage: Locator;
  readonly publicNoteTitle: Locator;
  readonly goalStatusBadge: Locator;
  readonly meetingDate: Locator;
  readonly summaryDisplay: Locator;
  readonly ctaLink: Locator;
  readonly errorState: Locator;
  readonly errorTitle: Locator;
  readonly errorDescription: Locator;
  readonly errorCtaLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.publicNotePage = page.getByTestId("public-note-page");
    this.publicNoteTitle = page.getByTestId("public-note-page-title");
    this.goalStatusBadge = page.getByTestId("public-note-goal-status-badge");
    this.meetingDate = page.getByTestId("public-note-meeting-date");
    this.summaryDisplay = page.getByTestId("public-note-summary-display");
    this.ctaLink = page.getByTestId("public-note-page-cta-link");
    this.errorState = page.getByTestId("public-note-error-state");
    this.errorTitle = page.getByTestId("public-note-error-title");
    this.errorDescription = page.getByTestId("public-note-error-description");
    this.errorCtaLink = page.getByTestId("public-note-error-cta-link");
  }

  async goto(token: string) {
    await this.page.goto(`/share/${token}`, { waitUntil: "domcontentloaded" });
  }

  async waitForPublicNote() {
    await this.publicNotePage.waitFor({ state: "visible" });
  }

  async waitForError() {
    await this.errorState.waitFor({ state: "visible" });
  }

  async getErrorTitle() {
    await this.errorTitle.waitFor({ state: "visible" });
    return this.errorTitle.textContent();
  }

  async getErrorDescription() {
    await this.errorDescription.waitFor({ state: "visible" });
    return this.errorDescription.textContent();
  }
}
