import { test, expect } from "./fixtures/base";
import { mockAiGenerate } from "./helpers/api.mock";
import { deleteNoteViaAPI } from "./helpers/notes.helpers";
import type { Page } from "playwright/test";

// Serial execution - tests run in order
test.describe.serial("Authenticated AI Generation Flow", () => {
  let createdNoteId: string | null = null;

  const mockSummary = {
    summary_text: "Zespół ustalił plan wdrożenia modułu raportowania i koordynację z marketingiem.",
    goal_status: "achieved",
    suggested_tag: "Moduł raportowania",
    generation_time_ms: 980,
    tokens_used: 742,
  };

  async function withSuccessfulAi(page: Page, run: () => Promise<void>) {
    const dispose = await mockAiGenerate(page, { status: 200, body: mockSummary });
    try {
      await run();
    } finally {
      await dispose();
    }
  }

  const deleteCreatedNote = async (page: Page) => {
    if (!createdNoteId) return;
    try {
      await deleteNoteViaAPI(page, createdNoteId);
    } catch (error) {
      console.warn("Cleanup warning after AI generation suite:", error);
    }
    createdNoteId = null;
  };

  test("01: should generate and save AI note from navbar flow", async ({
    notesPage,
    landingPage,
    noteDetailPage,
    page,
    user,
  }) => {
    // ARRANGE
    await notesPage.goto();
    await notesPage.waitForUserProfileLoaded(user.email);

    await withSuccessfulAi(page, async () => {
      // ACT - Navigate via navbar to landing page
      await notesPage.navbarGenerateNoteButton.click();
      await page.waitForURL((url) => url.pathname === "/", { timeout: 10000 });

      await landingPage.fillInput("Omówiono moduł raportowania, zaplanowano wdrożenie oraz działania marketingowe.");
      await landingPage.generateButton.click();
      await expect(page.getByTestId("summary-card")).toBeVisible({ timeout: 10000 });

      // Save note (authenticated flow shows save button)
      await expect(page.getByTestId("save-note-button")).toBeVisible();
      await page.getByTestId("save-note-button-save-button").click();
    });

    // ASSERT - Redirects to note details
    await page.waitForURL(/\/notes\/[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}$/i, {
      timeout: 15000,
    });

    const noteUrl = new URL(page.url());
    createdNoteId = noteUrl.pathname.split("/").pop() ?? null;
    expect(createdNoteId).toBeTruthy();

    await noteDetailPage.waitForLoaded();
    await expect(noteDetailPage.summaryDisplayText).toContainText("modułu raportowania");
    await expect(noteDetailPage.goalStatusSection).toBeVisible();
  });

  test("02: should display note in notes list", async ({ notesPage, page, user }) => {
    test.skip(!createdNoteId, "Note not generated in previous scenario");
    // ARRANGE - Verify createdNoteId is available from first test
    expect(createdNoteId).toBeTruthy();

    // Navigate to notes list
    await notesPage.goto();
    await notesPage.waitForUserProfileLoaded(user.email);

    // ASSERT - Note should be visible in the list with expected content
    // Look for the note by searching for the summary text
    await expect(page.locator("text=modułu raportowania").first()).toBeVisible();

    // Verify the note row is clickable
    const noteElement = page.locator("text=modułu raportowania").first();
    await noteElement.waitFor({ state: "visible" });
  });

  test("03: should allow editing summary of generated note", async ({ noteDetailPage }) => {
    test.skip(!createdNoteId, "Note not generated in previous scenario");
    // ARRANGE - Verify createdNoteId is available
    expect(createdNoteId).toBeTruthy();

    // Navigate to the note
    if (!createdNoteId) return;
    await noteDetailPage.goto(createdNoteId);
    await noteDetailPage.waitForLoaded();

    // ACT - Edit summary
    const editedSummary = "Nowe podsumowanie po edycji - moduł raportowania został wdrożony";
    await noteDetailPage.editSummary(editedSummary);

    // ASSERT - Check that textarea shows new text
    await expect(noteDetailPage.summaryTextarea).toHaveValue(editedSummary);

    // Save and verify
    await noteDetailPage.saveSummary();
    await expect(noteDetailPage.summaryDisplayText).toContainText(editedSummary);
  });

  test("04: should display goal status and allow changing it", async ({ noteDetailPage }) => {
    test.skip(!createdNoteId, "Note not generated in previous scenario");
    // ARRANGE - Verify createdNoteId is available
    expect(createdNoteId).toBeTruthy();

    // Navigate to the note
    if (!createdNoteId) return;
    await noteDetailPage.goto(createdNoteId);
    await noteDetailPage.waitForLoaded();

    // ACT & ASSERT - Goal status section is visible
    await expect(noteDetailPage.goalStatusSection).toBeVisible();
    await expect(noteDetailPage.goalStatusAchievedOption).toBeVisible();
    await expect(noteDetailPage.goalStatusNotAchievedOption).toBeVisible();

    // Verify initial status (should be achieved based on mock)
    const initialStatus = await noteDetailPage.getSelectedGoalStatus();
    expect(initialStatus).toBe("achieved");

    // Change to not_achieved
    await noteDetailPage.selectGoalStatus("not_achieved");
    let updatedStatus = await noteDetailPage.getSelectedGoalStatus();
    expect(updatedStatus).toBe("not_achieved");

    // Change back to achieved
    await noteDetailPage.selectGoalStatus("achieved");
    updatedStatus = await noteDetailPage.getSelectedGoalStatus();
    expect(updatedStatus).toBe("achieved");
  });

  test("05: should test tag assignment and search functionality", async ({ noteDetailPage, page }) => {
    test.skip(!createdNoteId, "Note not generated in previous scenario");
    // ARRANGE - Verify createdNoteId is available
    expect(createdNoteId).toBeTruthy();

    // Navigate to the note
    if (!createdNoteId) return;
    await noteDetailPage.goto(createdNoteId);
    await noteDetailPage.waitForLoaded();

    // ACT & ASSERT - Verify suggested tag from AI is assigned
    await expect(noteDetailPage.tagCombobox).toBeVisible();

    // Verify the suggested tag from AI generation is already assigned
    const currentTag = await noteDetailPage.getCurrentTagName();
    expect(currentTag).toContain("Moduł raportowania");

    // Test that tag combobox is functional - can search and open
    await noteDetailPage.openTagCombobox();
    await expect(noteDetailPage.tagComboboxSearchInput).toBeVisible();

    // Test searching for tags
    await noteDetailPage.searchTags("test");
    await expect(noteDetailPage.tagComboboxSearchInput).toHaveValue("test");

    // Clear search and close
    await noteDetailPage.tagComboboxSearchInput.clear();
    await page.keyboard.press("Escape");
  });

  test("06: should enable and manage public link sharing", async ({ noteDetailPage }) => {
    test.skip(!createdNoteId, "Note not generated in previous scenario");
    // ARRANGE - Verify createdNoteId is available
    expect(createdNoteId).toBeTruthy();

    // Navigate to the note
    if (!createdNoteId) return;
    await noteDetailPage.goto(createdNoteId);
    await noteDetailPage.waitForLoaded();

    // ACT - Enable public link
    await expect(noteDetailPage.publicLinkSection).toBeVisible();
    await expect(noteDetailPage.publicLinkToggle).toBeVisible();

    const isInitiallyEnabled = await noteDetailPage.isPublicLinkEnabled();
    await noteDetailPage.togglePublicLink(!isInitiallyEnabled);

    // Wait for URL input to be visible after toggle
    await expect(noteDetailPage.publicLinkUrlInput).toBeVisible({ timeout: 5000 });

    // ASSERT - Public link should be visible with generated URL
    const publicLinkUrl = await noteDetailPage.getPublicLinkUrl();
    expect(publicLinkUrl).toBeTruthy();
    expect(publicLinkUrl).toContain("share");

    // Verify copy button exists
    await expect(noteDetailPage.publicLinkCopyButton).toBeVisible();

    // Verify toggle is now in enabled state
    const isNowEnabled = await noteDetailPage.isPublicLinkEnabled();
    expect(isNowEnabled).toBe(!isInitiallyEnabled);

    // Toggle back to original state for other tests
    await noteDetailPage.togglePublicLink(isInitiallyEnabled);
    const isFinalState = await noteDetailPage.isPublicLinkEnabled();
    expect(isFinalState).toBe(isInitiallyEnabled);
  });

  test("07: should display original content section", async ({ noteDetailPage, page }) => {
    // ARRANGE - Verify createdNoteId is available
    expect(createdNoteId).toBeTruthy();

    // Navigate to the note
    if (!createdNoteId) return;
    await noteDetailPage.goto(createdNoteId);
    await noteDetailPage.waitForLoaded();

    // ACT & ASSERT - Original content section should be present
    await expect(noteDetailPage.originalContentSection).toBeVisible();

    // Expand original content if not already visible
    const hasToggle = await noteDetailPage.hasOriginalContentToggle();
    if (hasToggle) {
      await noteDetailPage.expandOriginalContent();
    }

    // Verify original text is visible (should contain content from AI generation input)
    const originalContent = await noteDetailPage.getOriginalContentText();
    expect(originalContent).toBeTruthy();
    expect(originalContent).toContain("moduł raportowania");

    // Cleanup after last test
    await deleteCreatedNote(page);
  });
});
