import { expect, type Locator, type Page } from "playwright/test";

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
  readonly sharedBadge: Locator;
  readonly publicLinkBadge: Locator;
  readonly tagSharedBadge: Locator;

  readonly originalContentSection: Locator;
  readonly originalContentToggleButton: Locator;
  readonly originalContentText: Locator;
  readonly originalContentContent: Locator;
  readonly originalContentShowMoreButton: Locator;

  readonly summarySection: Locator;
  readonly summaryDisplayText: Locator;
  readonly summaryNoSummaryMessage: Locator;
  readonly summaryEditButton: Locator;
  readonly summaryTextarea: Locator;
  readonly summaryCharCounter: Locator;
  readonly summarySaveButton: Locator;
  readonly summaryCancelButton: Locator;
  readonly summaryValidationError: Locator;

  readonly goalStatusSection: Locator;
  readonly goalStatusRadioGroup: Locator;
  readonly goalStatusAchievedOption: Locator;
  readonly goalStatusNotAchievedOption: Locator;
  readonly goalStatusLoadingIndicator: Locator;

  readonly meetingDateSection: Locator;
  readonly meetingDateButton: Locator;
  readonly meetingDateCalendar: Locator;
  readonly meetingDateLoadingIndicator: Locator;

  readonly tagCombobox: Locator;
  readonly tagComboboxTriggerButton: Locator;
  readonly tagComboboxCurrentTagName: Locator;
  readonly tagComboboxSearchInput: Locator;
  readonly tagComboboxEmptyMessage: Locator;
  readonly tagComboboxCreateNewTagOption: Locator;
  readonly tagComboboxLoadingIndicator: Locator;

  readonly tagAccessSection: Locator;
  readonly tagAccessManageButton: Locator;
  readonly publicLinkSection: Locator;
  readonly publicLinkToggleLabel: Locator;
  readonly publicLinkToggle: Locator;
  readonly publicLinkUrlInput: Locator;
  readonly publicLinkCopyButton: Locator;
  readonly publicLinkRotateButton: Locator;
  readonly publicLinkRotateDialog: Locator;

  readonly errorPage404: Locator;
  readonly errorPage404ReturnLink: Locator;
  readonly genericErrorPage: Locator;
  readonly genericErrorRetryButton: Locator;
  readonly loadingSkeleton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Main container
    this.container = page.getByTestId("note-detail-page");
    this.loadingSkeleton = page.getByTestId("note-detail-skeleton");

    // Header section
    this.header = page.getByTestId("note-header");
    this.tagBadge = page.getByTestId("note-header-tag-badge");
    this.ownerBadge = page.getByTestId("note-header-owner-badge");
    this.sharedBadge = page.getByTestId("note-header-shared-badge");
    this.publicLinkBadge = page.getByTestId("note-header-public-link-badge");
    this.tagSharedBadge = page.getByTestId("note-header-tag-shared-with-users-badge");

    // Original content section
    this.originalContentSection = page.getByTestId("original-content-section");
    this.originalContentToggleButton = page.getByTestId("original-content-section-toggle-button");
    this.originalContentContent = page.getByTestId("original-content-section-content");
    this.originalContentText = page.getByTestId("original-content-section-text");
    this.originalContentShowMoreButton = page.getByTestId("original-content-section-show-more-button");

    // Summary editor section
    this.summarySection = page.getByTestId("summary-editor");
    this.summaryDisplayText = page.getByTestId("summary-editor-display-text");
    this.summaryNoSummaryMessage = page.getByTestId("summary-editor-no-summary-message");
    this.summaryEditButton = page.getByTestId("summary-editor-edit-button");
    this.summaryTextarea = page.getByTestId("summary-editor-textarea");
    this.summaryCharCounter = page.getByTestId("summary-editor-char-counter");
    this.summarySaveButton = page.getByTestId("summary-editor-save-button");
    this.summaryCancelButton = page.getByTestId("summary-editor-cancel-button");
    this.summaryValidationError = page.getByTestId("summary-editor-validation-error");

    // Goal status section
    this.goalStatusSection = page.getByTestId("goal-status-radio");
    this.goalStatusRadioGroup = page.getByTestId("goal-status-radio-group");
    this.goalStatusAchievedOption = page.getByTestId("goal-status-radio-achieved-option");
    this.goalStatusNotAchievedOption = page.getByTestId("goal-status-radio-not_achieved-option");
    this.goalStatusLoadingIndicator = page.getByTestId("goal-status-radio-loading-indicator");

    // Meeting date section
    this.meetingDateSection = page.getByTestId("meeting-date-picker");
    this.meetingDateButton = page.getByTestId("meeting-date-picker-trigger-button");
    this.meetingDateCalendar = page.getByTestId("meeting-date-picker-calendar");
    this.meetingDateLoadingIndicator = page.getByTestId("meeting-date-picker-loading-indicator");

    // Tag combobox section
    this.tagCombobox = page.getByTestId("tag-combobox");
    this.tagComboboxTriggerButton = page.getByTestId("tag-combobox-trigger-button");
    this.tagComboboxCurrentTagName = page.getByTestId("tag-combobox-current-tag-name");
    this.tagComboboxSearchInput = page.getByTestId("tag-combobox-search-input");
    this.tagComboboxEmptyMessage = page.getByTestId("tag-combobox-empty-message");
    this.tagComboboxCreateNewTagOption = page.getByTestId("tag-combobox-create-new-tag-option");
    this.tagComboboxLoadingIndicator = page.getByTestId("tag-combobox-loading-indicator");

    // Tag access section
    this.tagAccessSection = page.getByTestId("tag-access-button");
    this.tagAccessManageButton = page.getByTestId("tag-access-button-manage-button");

    // Public link section
    this.publicLinkSection = page.getByTestId("public-link-section");
    this.publicLinkToggleLabel = page.getByTestId("public-link-section-toggle-label");
    this.publicLinkToggle = page.getByTestId("public-link-section-toggle-switch");
    this.publicLinkUrlInput = page.getByTestId("public-link-section-url-input");
    this.publicLinkCopyButton = page.getByTestId("public-link-section-copy-button");
    this.publicLinkRotateButton = page.getByTestId("public-link-section-rotate-button");
    this.publicLinkRotateDialog = page.getByTestId("public-link-section-rotate-dialog");

    // Error states
    this.errorPage404 = page.getByTestId("note-detail-page-404-error");
    this.errorPage404ReturnLink = page.getByTestId("note-detail-page-404-return-link");
    this.genericErrorPage = page.getByTestId("note-detail-page-generic-error");
    this.genericErrorRetryButton = page.getByTestId("note-detail-page-generic-error-retry-button");
  }

  async goto(noteId: string) {
    await this.page.goto(`/notes/${noteId}`);
  }

  async waitForLoaded() {
    // Wait for the loading skeleton to disappear, which indicates data has been fetched.
    await this.loadingSkeleton.waitFor({ state: "hidden", timeout: 15000 });
    // Then, wait for the main content container to be visible.
    await this.container.waitFor({ state: "visible", timeout: 5000 });
  }

  async waitForPageNotFound() {
    await this.errorPage404.waitFor({ state: "visible" });
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

  // Summary editor methods
  async editSummary(newSummary: string) {
    await this.summaryEditButton.click();
    await this.summaryTextarea.clear();
    await this.summaryTextarea.fill(newSummary);
  }

  async saveSummary() {
    await this.summarySaveButton.click();
  }

  async cancelSummary() {
    await this.summaryCancelButton.click();
  }

  async getSummaryText() {
    const text = await this.summaryDisplayText.textContent();
    return text || "";
  }

  async isSummaryInEditMode() {
    return await this.summaryTextarea.isVisible().catch(() => false);
  }

  // Goal status methods
  async selectGoalStatus(status: "achieved" | "not_achieved") {
    const button = status === "achieved" ? this.goalStatusAchievedOption : this.goalStatusNotAchievedOption;
    await button.click();
    await this.waitForGoalStatus(status);
  }

  async waitForGoalStatus(status: "achieved" | "not_achieved") {
    const selectedOption = status === "achieved" ? this.goalStatusAchievedOption : this.goalStatusNotAchievedOption;
    const otherOption = status === "achieved" ? this.goalStatusNotAchievedOption : this.goalStatusAchievedOption;

    await expect(selectedOption).toHaveAttribute("aria-checked", "true");
    await expect(otherOption).not.toHaveAttribute("aria-checked", "true");
    await expect(this.goalStatusLoadingIndicator).not.toBeVisible();
  }

  async getSelectedGoalStatus() {
    const achieved = await this.goalStatusAchievedOption.getAttribute("aria-checked");
    if (achieved === "true") return "achieved";

    const notAchieved = await this.goalStatusNotAchievedOption.getAttribute("aria-checked");
    if (notAchieved === "true") return "not_achieved";

    return null;
  }

  // Meeting date methods
  async openMeetingDatePicker() {
    await this.meetingDateButton.click();
  }

  async selectMeetingDate(dateText: string) {
    await this.openMeetingDatePicker();
    // Find and click the date option (assumes date text is visible)
    await this.page
      .locator("text=" + dateText)
      .first()
      .click();
  }

  // Tag combobox methods
  async openTagCombobox() {
    await this.tagComboboxTriggerButton.click();
  }

  async searchTags(query: string) {
    await this.tagComboboxSearchInput.fill(query);
  }

  async selectExistingTag(tagName: string) {
    await this.openTagCombobox();
    await this.page
      .getByTestId(new RegExp(`tag-combobox-existing-tag-item-`))
      .filter({ hasText: tagName })
      .first()
      .click();
  }

  async createNewTag(tagName: string) {
    await this.openTagCombobox();
    await this.searchTags(tagName);
    await this.tagComboboxCreateNewTagOption.click();
  }

  async getCurrentTagName() {
    return await this.tagComboboxCurrentTagName.textContent();
  }

  // Tag access methods
  async openTagAccessModal() {
    await this.tagAccessManageButton.click();
  }

  // Public link methods
  async togglePublicLink(enable: boolean) {
    const isCurrentlyEnabled = await this.publicLinkToggle.isChecked().catch(() => false);
    if (isCurrentlyEnabled !== enable) {
      await this.publicLinkToggle.click();
    }
  }

  async isPublicLinkEnabled() {
    return await this.publicLinkToggle.isChecked().catch(() => false);
  }

  async copyPublicLink() {
    await this.publicLinkCopyButton.click();
  }

  async openPublicLinkRotateDialog() {
    await this.publicLinkRotateButton.click();
  }

  async getPublicLinkUrl() {
    return await this.publicLinkUrlInput.inputValue();
  }

  // Error handling
  async isNotFoundError() {
    return await this.errorPage404.isVisible().catch(() => false);
  }

  async returnFromNotFound() {
    await this.errorPage404ReturnLink.click();
  }
}
