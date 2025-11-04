import { test, expect } from "./fixtures/base";
import { createSampleNotes, deleteAllNotesViaAPI } from "./helpers/notes.helpers";

test.describe("Note Details Page", () => {
  let noteId: string;

  test.beforeEach(async ({ authenticatedPage, notesListPage }) => {
    // Create a sample note for testing
    await notesListPage.goto();
    const notes = await createSampleNotes(authenticatedPage.page, 1);
    noteId = notes[0].id;
  });

  test.afterEach(async ({ authenticatedPage }) => {
    // Cleanup: delete all notes
    await deleteAllNotesViaAPI(authenticatedPage.page);
  });

  test.describe("Display and Navigation", () => {
    test("should display note content (title, summary, original content, tags, date, status)", async ({
      noteDetailPage,
    }) => {
      // ARRANGE
      await noteDetailPage.goto(noteId);

      // ACT
      await noteDetailPage.waitForLoaded();

      // ASSERT
      await expect(noteDetailPage.container).toBeVisible();
      await expect(noteDetailPage.header).toBeVisible();
      await expect(noteDetailPage.tagBadge).toBeVisible();
      await expect(noteDetailPage.ownerBadge).toBeVisible();
      await expect(noteDetailPage.originalContentSection).toBeVisible();
      await expect(noteDetailPage.summarySection).toBeVisible();
      await expect(noteDetailPage.goalStatusSection).toBeVisible();
      await expect(noteDetailPage.meetingDateSection).toBeVisible();
    });

    test("should display owner badge for note owner", async ({ noteDetailPage }) => {
      // ARRANGE
      await noteDetailPage.goto(noteId);

      // ACT
      await noteDetailPage.waitForLoaded();

      // ASSERT
      await expect(noteDetailPage.ownerBadge).toBeVisible();
      const badgeText = await noteDetailPage.ownerBadge.textContent();
      expect(badgeText).toContain("Właściciel");
    });

    test("should display original content section", async ({ noteDetailPage }) => {
      // ARRANGE
      await noteDetailPage.goto(noteId);

      // ACT
      await noteDetailPage.waitForLoaded();

      // ASSERT
      await expect(noteDetailPage.originalContentSection).toBeVisible();
      const originalText = await noteDetailPage.getOriginalContentText();
      expect(originalText).toBeTruthy();
    });
  });

  test.describe("Summary Editor", () => {
    test("should allow editing summary", async ({ noteDetailPage }) => {
      // ARRANGE
      await noteDetailPage.goto(noteId);
      await noteDetailPage.waitForLoaded();
      const newSummary = "Updated summary for testing";

      // ACT
      await noteDetailPage.editSummary(newSummary);

      // ASSERT
      const textareaValue = await noteDetailPage.summaryTextarea.inputValue();
      expect(textareaValue).toBe(newSummary);
    });

    test("should save summary changes", async ({ noteDetailPage }) => {
      // ARRANGE
      await noteDetailPage.goto(noteId);
      await noteDetailPage.waitForLoaded();
      const newSummary = "New summary text for the note";

      // ACT
      await noteDetailPage.editSummary(newSummary);
      await noteDetailPage.saveSummary();

      // Wait for save to complete
      await noteDetailPage.page.waitForTimeout(1000);
      await noteDetailPage.page.reload();
      await noteDetailPage.waitForLoaded();

      // ASSERT
      const savedSummary = await noteDetailPage.getSummaryText();
      expect(savedSummary).toContain(newSummary);
    });

    test("should cancel summary editing without saving", async ({ noteDetailPage }) => {
      // ARRANGE
      await noteDetailPage.goto(noteId);
      await noteDetailPage.waitForLoaded();
      const originalSummary = await noteDetailPage.getSummaryText();

      // ACT
      await noteDetailPage.editSummary("New unsaved text");
      await noteDetailPage.cancelSummary();

      // ASSERT
      const currentSummary = await noteDetailPage.getSummaryText();
      expect(currentSummary).toBe(originalSummary);
    });

    test("should enforce character limit", async ({ noteDetailPage }) => {
      // ARRANGE
      await noteDetailPage.goto(noteId);
      await noteDetailPage.waitForLoaded();
      const longText = "a".repeat(2001); // Exceeds 2000 char limit

      // ACT
      await noteDetailPage.summaryEditButton.click();
      await noteDetailPage.summaryTextarea.fill(longText);

      // ASSERT
      await expect(noteDetailPage.summaryValidationError).toBeVisible();
      await expect(noteDetailPage.summarySaveButton).toBeDisabled();
    });
  });

  test.describe("Goal Status Management", () => {
    test("should allow setting goal to achieved", async ({ noteDetailPage }) => {
      // ARRANGE
      await noteDetailPage.goto(noteId);
      await noteDetailPage.waitForLoaded();

      // ACT
      await noteDetailPage.selectGoalStatus("achieved");

      // Wait for save
      await noteDetailPage.page.waitForTimeout(1000);

      // ASSERT
      const status = await noteDetailPage.getSelectedGoalStatus();
      expect(status).toBe("achieved");
    });

    test("should allow setting goal to not achieved", async ({ noteDetailPage }) => {
      // ARRANGE
      await noteDetailPage.goto(noteId);
      await noteDetailPage.waitForLoaded();

      // ACT
      await noteDetailPage.selectGoalStatus("not_achieved");

      // Wait for save
      await noteDetailPage.page.waitForTimeout(1000);

      // ASSERT
      const status = await noteDetailPage.getSelectedGoalStatus();
      expect(status).toBe("not_achieved");
    });
  });

  test.describe("Meeting Date", () => {
    test("should allow opening date picker", async ({ noteDetailPage }) => {
      // ARRANGE
      await noteDetailPage.goto(noteId);
      await noteDetailPage.waitForLoaded();

      // ACT
      await noteDetailPage.openMeetingDatePicker();

      // ASSERT
      await expect(noteDetailPage.meetingDateCalendar).toBeVisible();
    });
  });

  test.describe("Tag Management", () => {
    test("should display current tag badge", async ({ noteDetailPage }) => {
      // ARRANGE
      await noteDetailPage.goto(noteId);

      // ACT
      await noteDetailPage.waitForLoaded();

      // ASSERT
      await expect(noteDetailPage.tagBadge).toBeVisible();
      const tagName = await noteDetailPage.tagBadge.textContent();
      expect(tagName).toBeTruthy();
    });

    test("should allow opening tag combobox", async ({ noteDetailPage }) => {
      // ARRANGE
      await noteDetailPage.goto(noteId);
      await noteDetailPage.waitForLoaded();

      // ACT
      await noteDetailPage.openTagCombobox();

      // ASSERT
      await expect(noteDetailPage.tagComboboxSearchInput).toBeVisible();
    });

    test("should allow searching tags", async ({ noteDetailPage }) => {
      // ARRANGE
      await noteDetailPage.goto(noteId);
      await noteDetailPage.waitForLoaded();

      // ACT
      await noteDetailPage.openTagCombobox();
      await noteDetailPage.searchTags("test");

      // ASSERT
      await expect(noteDetailPage.tagComboboxSearchInput).toHaveValue("test");
    });

    test("should show create new tag option", async ({ noteDetailPage }) => {
      // ARRANGE
      await noteDetailPage.goto(noteId);
      await noteDetailPage.waitForLoaded();

      // ACT
      await noteDetailPage.openTagCombobox();
      await noteDetailPage.searchTags("NewUniqueTag");

      // ASSERT
      await expect(noteDetailPage.tagComboboxCreateNewTagOption).toBeVisible();
    });
  });

  test.describe("Tag Access Management", () => {
    test("should display tag access button for owner", async ({ noteDetailPage }) => {
      // ARRANGE
      await noteDetailPage.goto(noteId);

      // ACT
      await noteDetailPage.waitForLoaded();

      // ASSERT
      await expect(noteDetailPage.tagAccessManageButton).toBeVisible();
    });

    test("should allow opening tag access modal", async ({ noteDetailPage, tagAccessModal }) => {
      // ARRANGE
      await noteDetailPage.goto(noteId);
      await noteDetailPage.waitForLoaded();

      // ACT
      await noteDetailPage.openTagAccessModal();

      // ASSERT
      await expect(tagAccessModal.modal).toBeVisible();
    });
  });

  test.describe("Public Link Management", () => {
    test("should display public link section for owner", async ({ noteDetailPage }) => {
      // ARRANGE
      await noteDetailPage.goto(noteId);

      // ACT
      await noteDetailPage.waitForLoaded();

      // ASSERT
      await expect(noteDetailPage.publicLinkSection).toBeVisible();
    });

    test("should allow enabling public link", async ({ noteDetailPage }) => {
      // ARRANGE
      await noteDetailPage.goto(noteId);
      await noteDetailPage.waitForLoaded();

      // ACT
      await noteDetailPage.togglePublicLink(true);

      // Wait for API call
      await noteDetailPage.page.waitForTimeout(1000);

      // ASSERT
      const isEnabled = await noteDetailPage.isPublicLinkEnabled();
      expect(isEnabled).toBe(true);
    });

    test("should display public link URL when enabled", async ({ noteDetailPage }) => {
      // ARRANGE
      await noteDetailPage.goto(noteId);
      await noteDetailPage.waitForLoaded();

      // ACT
      await noteDetailPage.togglePublicLink(true);
      await noteDetailPage.page.waitForTimeout(1000);

      // ASSERT
      const url = await noteDetailPage.getPublicLinkUrl();
      expect(url).toContain("/share/");
    });

    test("should allow copying public link", async ({ noteDetailPage }) => {
      // ARRANGE
      await noteDetailPage.goto(noteId);
      await noteDetailPage.waitForLoaded();
      await noteDetailPage.togglePublicLink(true);
      await noteDetailPage.page.waitForTimeout(1000);

      // ACT
      await noteDetailPage.copyPublicLink();

      // ASSERT - Check that button text changed to "Skopiowano"
      // The button should show the "copied" state after clicking
      await noteDetailPage.page.waitForFunction(
        (testId) => {
          const button = document.querySelector(`[data-testid="${testId}"]`);
          return button?.textContent?.includes("Skopiowano") === true;
        },
        "public-link-section-copy-button",
        { timeout: 3000 }
      );
      const buttonText = await noteDetailPage.publicLinkCopyButton.textContent();
      expect(buttonText).toContain("Skopiowano");
    });

    test("should allow rotating public link token", async ({ noteDetailPage }) => {
      // ARRANGE
      await noteDetailPage.goto(noteId);
      await noteDetailPage.waitForLoaded();
      await noteDetailPage.togglePublicLink(true);
      await noteDetailPage.page.waitForTimeout(1000);
      const originalUrl = await noteDetailPage.getPublicLinkUrl();

      // ACT
      await noteDetailPage.openPublicLinkRotateDialog();
      await expect(noteDetailPage.publicLinkRotateDialog).toBeVisible();

      // Find and click the confirm button in the dialog
      const confirmButton = noteDetailPage.page.getByTestId("public-link-section-rotate-dialog-confirm");
      await confirmButton.click();

      // Wait for rotation
      await noteDetailPage.page.waitForTimeout(1500);

      // ASSERT
      const newUrl = await noteDetailPage.getPublicLinkUrl();
      expect(newUrl).not.toBe(originalUrl);
    });

    test("should allow disabling public link", async ({ noteDetailPage }) => {
      // ARRANGE
      await noteDetailPage.goto(noteId);
      await noteDetailPage.waitForLoaded();
      await noteDetailPage.togglePublicLink(true);
      await noteDetailPage.page.waitForTimeout(1000);

      // ACT
      await noteDetailPage.togglePublicLink(false);

      // Wait for API call
      await noteDetailPage.page.waitForTimeout(1000);

      // ASSERT
      const isEnabled = await noteDetailPage.isPublicLinkEnabled();
      expect(isEnabled).toBe(false);
    });
  });

  test.describe("Error Handling", () => {
    test("should display error when accessing non-existent note", async ({ noteDetailPage }) => {
      // ARRANGE
      const nonExistentNoteId = "00000000-0000-0000-0000-000000000000";

      // ACT
      await noteDetailPage.goto(nonExistentNoteId);

      // ASSERT
      await expect(noteDetailPage.errorPage404).toBeVisible();
    });

    test("should allow returning from not found error", async ({ noteDetailPage }) => {
      // ARRANGE
      const nonExistentNoteId = "00000000-0000-0000-0000-000000000000";
      await noteDetailPage.goto(nonExistentNoteId);

      // ACT
      await noteDetailPage.returnFromNotFound();

      // ASSERT
      await expect(noteDetailPage.page).toHaveURL(/\/notes$/);
    });
  });
});
