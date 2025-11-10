import { authedTest as test, expect } from "./fixtures/index";
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
    // Arrange
    await notesPage.goto();
    await notesPage.waitForUserProfileLoaded(user.email);

    // Act
    await withSuccessfulAi(page, async () => {
      await notesPage.navbarGenerateNoteButton.click();
      await page.waitForURL((url) => url.pathname === "/", { timeout: 10000 });
      await landingPage.fillInput("Omówiono moduł raportowania, zaplanowano wdrożenie oraz działania marketingowe.");
      await landingPage.generateButton.click();
      await page.waitForSelector("[data-testid='summary-card']", { state: "visible", timeout: 10000 });
      await page.getByTestId("save-note-button-save-button").click();
    });

    await page.waitForURL(/\/notes\/[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}$/i, {
      timeout: 15000,
    });
    const noteUrl = new URL(page.url());
    createdNoteId = noteUrl.pathname.split("/").pop() ?? null;
    await noteDetailPage.waitForLoaded();

    // Assert
    expect(createdNoteId).toBeTruthy();
    await expect(noteDetailPage.summaryDisplayText).toContainText("modułu raportowania");
    await expect(noteDetailPage.goalStatusSection).toBeVisible();
  });

  test("02: should display note in notes list", async ({ notesPage, user }) => {
    test.skip(!createdNoteId, "Note not generated in previous scenario");

    // Arrange
    expect(createdNoteId).toBeTruthy();
    await notesPage.goto();
    await notesPage.waitForUserProfileLoaded(user.email);

    // Act
    const noteElement = notesPage.getNoteByText("modułu raportowania");

    // Assert
    await expect(noteElement).toBeVisible();
    await noteElement.waitFor({ state: "visible" });
  });

  test("03: should allow editing summary of generated note", async ({ noteDetailPage }) => {
    test.skip(!createdNoteId, "Note not generated in previous scenario");

    // Arrange
    expect(createdNoteId).toBeTruthy();
    if (!createdNoteId) return;
    await noteDetailPage.goto(createdNoteId);
    await noteDetailPage.waitForLoaded();
    const editedSummary = "Nowe podsumowanie po edycji - moduł raportowania został wdrożony";

    // Act
    await noteDetailPage.editSummary(editedSummary);
    await noteDetailPage.saveSummary();

    // Assert
    await expect(noteDetailPage.summaryTextarea).toHaveValue(editedSummary);
    await expect(noteDetailPage.summaryDisplayText).toContainText(editedSummary);
  });

  test("04: should display goal status and allow changing it", async ({ noteDetailPage }) => {
    test.skip(!createdNoteId, "Note not generated in previous scenario");

    // Arrange
    expect(createdNoteId).toBeTruthy();
    if (!createdNoteId) return;
    await noteDetailPage.goto(createdNoteId);
    await noteDetailPage.waitForLoaded();

    // Act
    const initialStatus = await noteDetailPage.getSelectedGoalStatus();
    await noteDetailPage.selectGoalStatus("not_achieved");
    await noteDetailPage.waitForGoalStatus("not_achieved");
    const statusAfterFirstChange = await noteDetailPage.getSelectedGoalStatus();
    await noteDetailPage.selectGoalStatus("achieved");
    await noteDetailPage.waitForGoalStatus("achieved");
    const statusAfterSecondChange = await noteDetailPage.getSelectedGoalStatus();

    // Assert
    await expect(noteDetailPage.goalStatusSection).toBeVisible();
    await expect(noteDetailPage.goalStatusAchievedOption).toBeVisible();
    await expect(noteDetailPage.goalStatusNotAchievedOption).toBeVisible();
    expect(initialStatus).toBe("achieved");
    expect(statusAfterFirstChange).toBe("not_achieved");
    expect(statusAfterSecondChange).toBe("achieved");
  });

  test("05: should test tag assignment and search functionality", async ({ noteDetailPage, page }) => {
    test.skip(!createdNoteId, "Note not generated in previous scenario");

    // Arrange
    expect(createdNoteId).toBeTruthy();
    if (!createdNoteId) return;
    await noteDetailPage.goto(createdNoteId);
    await noteDetailPage.waitForLoaded();

    // Act
    const currentTag = await noteDetailPage.getCurrentTagName();
    await noteDetailPage.openTagCombobox();
    await noteDetailPage.searchTags("test");
    const searchValue = await noteDetailPage.tagComboboxSearchInput.inputValue();
    await noteDetailPage.tagComboboxSearchInput.clear();
    await page.keyboard.press("Escape");

    // Assert
    await expect(noteDetailPage.tagCombobox).toBeVisible();
    expect(currentTag).toContain("Moduł raportowania");
    expect(searchValue).toBe("test");
  });

  test("06: should enable and manage public link sharing", async ({ noteDetailPage }) => {
    test.skip(!createdNoteId, "Note not generated in previous scenario");

    // Arrange
    expect(createdNoteId).toBeTruthy();
    if (!createdNoteId) return;
    await noteDetailPage.goto(createdNoteId);
    await noteDetailPage.waitForLoaded();

    // Act
    const isInitiallyEnabled = await noteDetailPage.isPublicLinkEnabled();
    await noteDetailPage.togglePublicLink(!isInitiallyEnabled);
    await expect(noteDetailPage.publicLinkUrlInput).toBeVisible({ timeout: 5000 });
    const publicLinkUrl = await noteDetailPage.getPublicLinkUrl();
    const isNowEnabled = await noteDetailPage.isPublicLinkEnabled();
    await noteDetailPage.togglePublicLink(isInitiallyEnabled);
    const isFinalState = await noteDetailPage.isPublicLinkEnabled();

    // Assert
    await expect(noteDetailPage.publicLinkSection).toBeVisible();
    await expect(noteDetailPage.publicLinkToggle).toBeVisible();
    expect(publicLinkUrl).toBeTruthy();
    expect(publicLinkUrl).toContain("share");
    expect(isNowEnabled).toBe(!isInitiallyEnabled);
    expect(isFinalState).toBe(isInitiallyEnabled);
  });

  test("07: should display original content section", async ({ noteDetailPage, page }) => {
    // Arrange
    expect(createdNoteId).toBeTruthy();
    if (!createdNoteId) return;
    await noteDetailPage.goto(createdNoteId);
    await noteDetailPage.waitForLoaded();

    // Act
    const hasToggle = await noteDetailPage.hasOriginalContentToggle();
    if (hasToggle) {
      await noteDetailPage.expandOriginalContent();
    }
    const originalContent = await noteDetailPage.getOriginalContentText();

    // Assert
    await expect(noteDetailPage.originalContentSection).toBeVisible();
    expect(originalContent).toBeTruthy();
    expect(originalContent).toContain("moduł raportowania");

    // Cleanup after last test
    await deleteCreatedNote(page);
  });
});
