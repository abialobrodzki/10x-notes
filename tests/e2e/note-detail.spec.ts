import { test, expect } from "./fixtures/base";
import { createNoteViaAPI, deleteNoteViaAPI } from "./helpers/notes.helpers";

test.describe.configure({ mode: "serial" });

test.describe("Note Detail Page", () => {
  let noteId: string;
  const multilineContent = Array.from({ length: 12 }, (_, index) => `Linia ${index + 1} spotkania`).join("\n");

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({
      storageState: "./tests/e2e/.auth/user.json",
    });
    const page = await context.newPage();

    const note = await createNoteViaAPI(page, {
      original_content: multilineContent,
      summary_text: "To jest podsumowanie generowane dla testu E2E.",
      meeting_date: new Date().toISOString().split("T")[0],
      goal_status: "achieved",
      tag_name: "E2E Note Detail",
      is_ai_generated: true,
    });

    noteId = note.id;
    await context.close();
  });

  test.afterAll(async ({ browser }) => {
    if (!noteId) return;
    const context = await browser.newContext({
      storageState: "./tests/e2e/.auth/user.json",
    });
    const page = await context.newPage();
    await deleteNoteViaAPI(page, noteId);
    await context.close();
  });

  test.beforeEach(async ({ noteDetailPage }) => {
    await noteDetailPage.goto(noteId);
    await noteDetailPage.waitForLoaded();
  });

  test("should display note metadata and summary section", async ({ noteDetailPage }) => {
    await expect(noteDetailPage.header).toBeVisible();
    await expect(noteDetailPage.tagBadge).toBeVisible();
    await expect(noteDetailPage.ownerBadge).toBeVisible();
    await expect(noteDetailPage.summarySection).toBeVisible();
    await expect(noteDetailPage.summaryDisplayText).toContainText("To jest podsumowanie");
    await expect(noteDetailPage.goalStatusSection).toBeVisible();
    await expect(noteDetailPage.goalStatusAchievedOption).toHaveAttribute("aria-checked", "true");
    await expect(noteDetailPage.meetingDateSection).toBeVisible();
    await expect(noteDetailPage.meetingDateButton).toContainText(new Date().getFullYear().toString());
  });

  test("should expand original content when requested", async ({ noteDetailPage }) => {
    const hasToggle = await noteDetailPage.hasOriginalContentToggle();
    test.skip(!hasToggle, "Original content is too short to display toggle");

    await noteDetailPage.expandOriginalContent();
    if (await noteDetailPage.hasOriginalContentToggle()) {
      await expect(noteDetailPage.originalContentToggleButton).toHaveText("Pokaż mniej");
    }
    const content = await noteDetailPage.getOriginalContentText();
    expect(content?.split("\n").length).toBeGreaterThan(8);
  });

  test("should expose tag access and public link controls", async ({ noteDetailPage }) => {
    await expect(noteDetailPage.tagAccessSection).toBeVisible();
    await expect(noteDetailPage.tagAccessManageButton).toBeVisible();
    await expect(noteDetailPage.publicLinkSection).toBeVisible();
    await expect(noteDetailPage.publicLinkToggle).toBeVisible();
  });
});
