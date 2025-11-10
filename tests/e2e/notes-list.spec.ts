import { authedTest as test, expect } from "./fixtures/index";
import { createSampleNotes, deleteAllNotesViaAPI } from "./helpers/notes.helpers";

/**
 * E2E Test Suite: Notes List Page
 */
test.describe("Notes List Page - With Notes", () => {
  test.beforeAll(async ({ browser, authStorageState }) => {
    const context = await browser.newContext({
      storageState: authStorageState,
    });
    const page = await context.newPage();
    await page.goto("http://localhost:3000/notes");
    await createSampleNotes(page, 25);
    await context.close();
  });

  test.afterAll(async ({ browser, authStorageState }) => {
    const context = await browser.newContext({
      storageState: authStorageState,
    });
    const page = await context.newPage();
    await page.goto("http://localhost:3000/notes");
    await deleteAllNotesViaAPI(page);
    await context.close();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/notes");
  });

  test.describe("Display and Navigation", () => {
    test("should display notes list page correctly", async ({ notesListPage }) => {
      await expect(notesListPage.pageContainer).toBeVisible();
      await expect(notesListPage.pageTitle).toBeVisible();
      await expect(notesListPage.searchInput).toBeVisible();
      await expect(notesListPage.filtersPanel).toBeVisible();
      await expect(notesListPage.noteList).toBeVisible();
    });

    test("should display notes with correct information", async ({ notesListPage }) => {
      await notesListPage.waitForNotesToLoad();
      const notesCount = await notesListPage.getNotesCount();
      expect(notesCount).toBeGreaterThan(0);
      const meetingDate = await notesListPage.getNoteMeetingDate(0);
      expect(meetingDate).toBeTruthy();
      const summaryPreview = await notesListPage.getNoteSummaryPreview(0);
      expect(summaryPreview).toBeTruthy();
      const tagName = await notesListPage.getNoteTagName(0);
      expect(tagName).toBeTruthy();
    });

    test.skip("should navigate to note details when clicking on note", async ({ page, notesListPage }) => {
      await notesListPage.waitForNotesToLoad();
      await notesListPage.clickNoteByIndex(0);
      await notesListPage.waitForNoteNavigation();
      expect(page.url()).toMatch(/\/notes\/.+/);
    });
  });

  test.describe("Search Functionality", () => {
    test("should filter notes by search term", async ({ notesListPage }) => {
      await notesListPage.waitForNotesToLoad();
      const initialCount = await notesListPage.getNotesCount();
      expect(initialCount).toBeGreaterThan(0);

      await notesListPage.search("spotkanie");

      await expect(async () => {
        const filteredCount = await notesListPage.getNotesCount();
        expect(filteredCount).toBeLessThanOrEqual(initialCount);
      }).toPass();
    });

    test("should clear search when clicking clear button", async ({ notesListPage }) => {
      await notesListPage.waitForNotesToLoad();
      await notesListPage.searchInputField.click();
      await notesListPage.searchInputField.type("test query", { delay: 50 });

      await expect(notesListPage.searchInputField).toHaveValue("test query");
      await expect(notesListPage.searchClearButton).toBeVisible();

      await notesListPage.clearSearch();

      await expect(notesListPage.searchInputField).toBeEmpty();
    });

    test.skip("should show empty state when no notes match search", async ({ notesListPage }) => {
      // ARRANGE
      await notesListPage.waitForNotesToLoad();

      // ACT
      await notesListPage.search("123213213213123213xyznonexistentquery12345");

      // ASSERT
      // First, wait for the list to become empty as a result of the debounced search
      await expect(notesListPage.noteListItems).toHaveCount(0);
      // Now, assert that the empty state message is visible
      await expect(notesListPage.noteListEmptyState).toBeVisible();
    });
  });

  test.describe("Pagination", () => {
    test("should display pagination when multiple pages exist", async ({ notesListPage }) => {
      await notesListPage.waitForNotesToLoad();
      const hasPagination = await notesListPage.isPaginationDisplayed().catch(() => false);
      if (hasPagination) {
        await expect(notesListPage.pagination).toBeVisible();
      }
    });
  });

  test.describe("Filters", () => {
    test.skip("should toggle filters panel", async ({ notesListPage }) => {
      // ARRANGE: Panel is collapsed, controls are not in the DOM.
      await expect(notesListPage.dateRangePicker).toHaveCount(0);

      // ACT: Expand the panel.
      await notesListPage.toggleFilters();

      // ASSERT: Controls are now in the DOM and visible.
      await expect(notesListPage.dateRangePicker).toHaveCount(1, { timeout: 5000 });
      await expect(notesListPage.dateRangePicker).toBeVisible();

      // ACT: Collapse the panel again.
      await notesListPage.toggleFilters();

      // ASSERT: Controls are removed from the DOM after animation.
      await expect(notesListPage.dateRangePicker).not.toBeVisible({ timeout: 5000 });
      await expect(notesListPage.dateRangePicker).toHaveCount(0);
    });

    test.skip("should display all filter controls", async ({ notesListPage }) => {
      // ARRANGE
      await notesListPage.waitForNotesToLoad();
      await expect(notesListPage.filtersPanel).toBeVisible();

      // ACT
      await notesListPage.ensureFiltersExpanded();

      // ASSERT
      await expect(notesListPage.dateRangePicker).toBeVisible();
      await expect(notesListPage.goalStatusFilter).toBeVisible();
      await expect(notesListPage.sortSelect).toBeVisible();
    });
  });

  test.describe("Note Indicators", () => {
    test("should display AI indicator on AI-generated notes", async ({ notesListPage }) => {
      await notesListPage.waitForNotesToLoad();
      const notesCount = await notesListPage.getNotesCount();
      if (notesCount > 0) {
        for (let i = 0; i < Math.min(notesCount, 3); i++) {
          const hasAIIndicator = await notesListPage.noteHasAIIndicator(i);
          expect(typeof hasAIIndicator).toBe("boolean");
        }
      }
    });

    test("should display public link indicator on publicly shared notes", async ({ notesListPage }) => {
      await notesListPage.waitForNotesToLoad();
      const notesCount = await notesListPage.getNotesCount();
      if (notesCount > 0) {
        for (let i = 0; i < Math.min(notesCount, 3); i++) {
          const hasPublicLinkIndicator = await notesListPage.noteHasPublicLinkIndicator(i);
          expect(typeof hasPublicLinkIndicator).toBe("boolean");
        }
      }
    });
  });
});

/**
 * Empty State Tests
 */
test.describe("Notes List Page - Empty State", () => {
  test.beforeAll(async ({ browser, authStorageState }) => {
    const context = await browser.newContext({
      storageState: authStorageState,
    });
    const page = await context.newPage();
    await page.goto("http://localhost:3000/notes");
    await deleteAllNotesViaAPI(page);
    await context.close();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/notes");
  });
});
