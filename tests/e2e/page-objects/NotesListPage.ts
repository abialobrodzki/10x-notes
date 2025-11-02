import { type Locator, type Page } from "playwright/test";

/**
 * Page Object Model for Notes List Page (/notes)
 *
 * Encapsulates all interactions with the notes list page following Playwright best practices:
 * - Uses data-testid selectors for resilient element location
 * - Provides semantic methods for user actions (Arrange-Act-Assert pattern)
 * - Centralizes selectors for easy maintenance
 *
 * @see .cursor/rules/playwright-e2e-testing.mdc for E2E testing guidelines
 */
export class NotesListPage {
  readonly page: Page;

  // Main content
  readonly mainContent: Locator;
  readonly pageTitle: Locator;

  // Search
  readonly searchInput: Locator;
  readonly searchInputField: Locator;
  readonly searchClearButton: Locator;

  // Filters
  readonly filtersPanel: Locator;
  readonly filtersToggleButton: Locator;
  readonly filtersClearButton: Locator;
  readonly dateRangePicker: Locator;
  readonly goalStatusFilter: Locator;
  readonly sortSelect: Locator;

  // Notes list
  readonly noteList: Locator;
  readonly noteListItems: Locator;
  readonly noteListEmptyState: Locator;
  readonly noteListLoadingSkeleton: Locator;

  // Pagination
  readonly pagination: Locator;
  readonly paginationFirstPageButton: Locator;
  readonly paginationPreviousPageButton: Locator;
  readonly paginationNextPageButton: Locator;
  readonly paginationLastPageButton: Locator;

  // Infinite loader (mobile)
  readonly infiniteLoader: Locator;
  readonly infiniteLoaderNoMoreNotes: Locator;

  constructor(page: Page) {
    this.page = page;

    // Main content
    this.mainContent = page.getByTestId("app-shell-main-content");
    this.pageTitle = page.getByRole("heading", { name: /Moje notatki/i });

    // Search
    this.searchInput = page.getByTestId("search-input");
    this.searchInputField = page.getByTestId("search-input-field");
    this.searchClearButton = page.getByTestId("search-input-clear-button");

    // Filters
    this.filtersPanel = page.getByTestId("filters-panel");
    this.filtersToggleButton = page.getByTestId("filters-panel-toggle-button");
    this.filtersClearButton = page.getByTestId("filters-panel-clear-button");
    this.dateRangePicker = page.getByTestId("date-range-picker");
    this.goalStatusFilter = page.getByTestId("goal-status-multi-select-trigger");
    this.sortSelect = page.getByTestId("sort-select-trigger");

    // Notes list
    this.noteList = page.getByTestId("note-list");
    this.noteListItems = page.getByTestId("note-list-item");
    this.noteListEmptyState = page.getByTestId("note-list-empty-state");
    this.noteListLoadingSkeleton = page.getByTestId("note-list-loading-skeleton");

    // Pagination
    this.pagination = page.getByTestId("pagination");
    this.paginationFirstPageButton = page.getByTestId("pagination-first-page-button");
    this.paginationPreviousPageButton = page.getByTestId("pagination-previous-page-button");
    this.paginationNextPageButton = page.getByTestId("pagination-next-page-button");
    this.paginationLastPageButton = page.getByTestId("pagination-last-page-button");

    // Infinite loader (mobile)
    this.infiniteLoader = page.getByTestId("infinite-loader");
    this.infiniteLoaderNoMoreNotes = page.getByTestId("infinite-loader-no-more-notes");
  }

  /**
   * Navigate to notes list page
   */
  async goto() {
    await this.page.goto("/notes");
  }

  /**
   * Check if notes list page is displayed
   * @returns True if page is visible
   */
  async isDisplayed() {
    return await this.mainContent.isVisible();
  }

  /**
   * Search for notes
   * @param query - Search query
   */
  async search(query: string) {
    await this.searchInputField.fill(query);
  }

  /**
   * Clear search
   */
  async clearSearch() {
    await this.searchClearButton.click();
  }

  /**
   * Get number of visible notes
   * @returns Number of note items
   */
  async getNotesCount() {
    return await this.noteListItems.count();
  }

  /**
   * Click on a note by index
   * @param index - Note index (0-based)
   */
  async clickNoteByIndex(index: number) {
    const noteItem = this.noteListItems.nth(index);

    // Wait for the note to be visible
    await noteItem.waitFor({ state: "visible", timeout: 5000 });

    // Scroll into view if needed
    await noteItem.scrollIntoViewIfNeeded();

    // Click the note
    await noteItem.click();

    // Wait a bit for click to register
    await this.page.waitForTimeout(100);
  }

  /**
   * Get note item by index
   * @param index - Note index (0-based)
   * @returns Note item locator
   */
  getNoteByIndex(index: number) {
    return this.noteListItems.nth(index);
  }

  /**
   * Check if empty state is displayed
   * @returns True if empty state is visible
   */
  async isEmptyStateDisplayed() {
    return await this.noteListEmptyState.isVisible();
  }

  /**
   * Check if loading skeleton is displayed
   * @returns True if loading skeleton is visible
   */
  async isLoadingSkeletonDisplayed() {
    return await this.noteListLoadingSkeleton.isVisible();
  }

  /**
   * Access empty state content
   */
  get emptyState() {
    return this.noteListEmptyState;
  }

  get emptyStateMessage() {
    return this.noteListEmptyState.getByTestId("note-list-empty-message");
  }

  get emptyStateCTA() {
    return this.noteListEmptyState.getByTestId("note-list-empty-state-cta");
  }

  /**
   * Wait for notes to load
   */
  async waitForNotesToLoad() {
    await this.noteList.waitFor({ state: "visible" });
  }

  /**
   * Navigate to next page
   */
  async goToNextPage() {
    await this.paginationNextPageButton.click();
  }

  /**
   * Get current page number from URL
   */
  async getCurrentPageNumber() {
    const { searchParams } = new URL(this.page.url());
    const pageParam = searchParams.get("page");
    return pageParam ? Number.parseInt(pageParam, 10) : 1;
  }

  /**
   * Wait until URL reflects given page number
   */
  async waitForPageNumber(pageNumber: number, timeout = 10000) {
    await this.page.waitForURL(
      (url) => {
        const param = url.searchParams.get("page");
        const current = param ? Number.parseInt(param, 10) : 1;
        return current === pageNumber;
      },
      { timeout }
    );
  }

  /**
   * Navigate to previous page
   */
  async goToPreviousPage() {
    await this.paginationPreviousPageButton.click();
  }

  /**
   * Navigate to first page
   */
  async goToFirstPage() {
    await this.paginationFirstPageButton.click();
  }

  /**
   * Navigate to last page
   */
  async goToLastPage() {
    await this.paginationLastPageButton.click();
  }

  /**
   * Navigate to specific page
   * @param pageNumber - Page number (1-based)
   */
  async goToPage(pageNumber: number) {
    const pageButton = this.page.getByTestId(`pagination-page-button-${pageNumber}`);
    await pageButton.click();
  }

  /**
   * Check if pagination is displayed
   * @returns True if pagination is visible
   */
  async isPaginationDisplayed() {
    return await this.pagination.isVisible();
  }

  /**
   * Toggle filters panel (expand/collapse)
   */
  async toggleFilters() {
    await this.filtersToggleButton.click();
  }

  /**
   * Ensure filters panel is expanded so controls are rendered
   */
  async ensureFiltersExpanded() {
    const controlsRendered = (await this.dateRangePicker.count()) > 0;
    if (!controlsRendered) {
      await this.filtersToggleButton.click();
      await this.dateRangePicker.first().waitFor({ state: "visible" });
    }
  }

  /**
   * Clear all filters
   */
  async clearFilters() {
    await this.filtersClearButton.click();
  }

  /**
   * Get note meeting date by index
   * @param index - Note index (0-based)
   * @returns Meeting date text
   */
  async getNoteMeetingDate(index: number) {
    const noteItem = this.getNoteByIndex(index);
    const dateElement = noteItem.getByTestId("note-list-item-meeting-date");
    return await dateElement.textContent();
  }

  /**
   * Get note summary preview by index
   * @param index - Note index (0-based)
   * @returns Summary preview text
   */
  async getNoteSummaryPreview(index: number) {
    const noteItem = this.getNoteByIndex(index);
    const summaryElement = noteItem.getByTestId("note-list-item-summary-preview");
    return await summaryElement.textContent();
  }

  /**
   * Get note tag name by index
   * @param index - Note index (0-based)
   * @returns Tag name text
   */
  async getNoteTagName(index: number) {
    const noteItem = this.getNoteByIndex(index);
    const tagElement = noteItem.getByTestId("note-list-item-tag-name");
    return await tagElement.textContent();
  }

  /**
   * Check if note has AI indicator
   * @param index - Note index (0-based)
   * @returns True if AI indicator is visible
   */
  async noteHasAIIndicator(index: number) {
    const noteItem = this.getNoteByIndex(index);
    const aiIndicator = noteItem.getByTestId("note-list-item-ai-indicator");
    return await aiIndicator.isVisible().catch(() => false);
  }

  /**
   * Check if note has public link indicator
   * @param index - Note index (0-based)
   * @returns True if public link indicator is visible
   */
  async noteHasPublicLinkIndicator(index: number) {
    const noteItem = this.getNoteByIndex(index);
    const publicLinkIndicator = noteItem.getByTestId("note-list-item-public-link-indicator");
    return await publicLinkIndicator.isVisible().catch(() => false);
  }

  /**
   * Check if note has shared indicator
   * @param index - Note index (0-based)
   * @returns True if shared indicator is visible
   */
  async noteHasSharedIndicator(index: number) {
    const noteItem = this.getNoteByIndex(index);
    const sharedIndicator = noteItem.getByTestId("note-list-item-shared-indicator");
    return await sharedIndicator.isVisible().catch(() => false);
  }

  /**
   * Wait for navigation to note details page
   * @param timeout - max wait time
   */
  async waitForNoteNavigation(timeout = 10000) {
    const targetPattern = /\/notes\/[^/?#]+/;

    await this.page
      .waitForURL(
        (url) => {
          const pathname = url.pathname;
          return targetPattern.test(pathname);
        },
        { timeout }
      )
      .catch(async (error) => {
        const current = this.page.url();
        if (!targetPattern.test(new URL(current).pathname)) {
          throw error;
        }
      });
  }
}
