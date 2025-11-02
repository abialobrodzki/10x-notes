import { type Locator, type Page } from "playwright/test";

/**
 * Page Object Model for Note Detail Page (/notes/:id)
 *
 * Provides access to metadata sections, original content controls,
 * and management widgets such as tag access and public link.
 */
export class NoteDetailPage {
  readonly page: Page;

  readonly container: Locator;
  readonly header: Locator;
  readonly tagBadge: Locator;
  readonly ownerBadge: Locator;
  readonly publicLinkBadge: Locator;

  readonly originalContentSection: Locator;
  readonly originalContentToggleButton: Locator;
  readonly originalContentText: Locator;

  readonly summarySection: Locator;
  readonly summaryDisplayText: Locator;

  readonly goalStatusSection: Locator;
  readonly goalStatusAchievedOption: Locator;
  readonly goalStatusNotAchievedOption: Locator;
  readonly meetingDateSection: Locator;
  readonly meetingDateButton: Locator;

  readonly tagAccessSection: Locator;
  readonly tagAccessManageButton: Locator;
  readonly publicLinkSection: Locator;
  readonly publicLinkToggle: Locator;

  constructor(page: Page) {
    this.page = page;

    this.container = page.getByTestId("note-detail-page");
    this.header = page.getByTestId("note-header");
    this.tagBadge = page.getByTestId("note-header-tag-badge");
    this.ownerBadge = page.getByTestId("note-header-owner-badge");
    this.publicLinkBadge = page.getByTestId("note-header-public-link-badge");

    this.originalContentSection = page.getByTestId("original-content-section");
    this.originalContentToggleButton = page.getByTestId("original-content-section-toggle-button");
    this.originalContentText = page.getByTestId("original-content-section-text");

    this.summarySection = page.getByTestId("summary-editor");
    this.summaryDisplayText = page.getByTestId("summary-editor-display-text");

    this.goalStatusSection = page.getByTestId("goal-status-radio");
    this.goalStatusAchievedOption = page.getByTestId("goal-status-radio-achieved-option");
    this.goalStatusNotAchievedOption = page.getByTestId("goal-status-radio-not_achieved-option");
    this.meetingDateSection = page.getByTestId("meeting-date-picker");
    this.meetingDateButton = page.getByTestId("meeting-date-picker-trigger-button");

    this.tagAccessSection = page.getByTestId("tag-access-button");
    this.tagAccessManageButton = page.getByTestId("tag-access-button-manage-button");
    this.publicLinkSection = page.getByTestId("public-link-section");
    this.publicLinkToggle = page.getByTestId("public-link-section-toggle-switch");
  }

  async goto(noteId: string) {
    await this.page.goto(`/notes/${noteId}`);
  }

  async waitForLoaded() {
    await this.container.waitFor({ state: "visible" });
  }

  async hasOriginalContentToggle() {
    return await this.originalContentToggleButton.isVisible().catch(() => false);
  }

  async expandOriginalContent() {
    if (await this.hasOriginalContentToggle()) {
      await this.originalContentToggleButton.click();
    }
  }

  async getOriginalContentText() {
    return await this.originalContentText.textContent();
  }
}
