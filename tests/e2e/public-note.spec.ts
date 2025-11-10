import { authedTest as test, expect } from "./fixtures/index";
import { createNoteViaAPI, createPublicLinkViaAPI, updatePublicLinkViaAPI } from "./helpers/notes.helpers";

test.describe("Public Note Page", () => {
  test("should display a public note correctly for a valid token", async ({ page }) => {
    // Arrange
    const testNote = await createNoteViaAPI(page, {
      original_content: "This is a test note for public link testing.",
      summary_text: "Public note test summary.",
      meeting_date: new Date().toISOString().split("T")[0],
      goal_status: "achieved",
      tag_name: "Public Link Tests",
      is_ai_generated: false,
    });
    const publicLink = await createPublicLinkViaAPI(page, testNote.id);
    const browser = page.context().browser();
    if (!browser) throw new Error("Browser not available");
    const anonContext = await browser.newContext();
    const anonPage = await anonContext.newPage();

    // Act
    await anonPage.goto(`http://localhost:3000/share/${publicLink.token}`, { waitUntil: "domcontentloaded" });

    // Assert
    await expect(anonPage.getByTestId("public-note-page")).toBeVisible();
    await expect(anonPage.getByTestId("public-note-page-title")).toBeVisible();
    await expect(anonPage.getByTestId("public-note-goal-status-badge")).toBeVisible();
    await expect(anonPage.getByTestId("public-note-meeting-date")).toBeVisible();
    await expect(anonPage.getByTestId("public-note-summary-display")).toBeVisible();
    await expect(anonPage.getByTestId("public-note-page-cta-link")).toBeVisible();
    await expect(anonPage.getByTestId("public-note-summary-display")).toContainText("Public note test summary.");

    // Cleanup
    await anonContext.close();
  });

  test("should display 404 error for an invalid token", async ({ page }) => {
    // Arrange
    const nonExistentToken = "00000000-0000-0000-0000-000000000000";
    const browser = page.context().browser();
    if (!browser) throw new Error("Browser not available");
    const anonContext = await browser.newContext();
    const anonPage = await anonContext.newPage();

    // Act
    await anonPage.goto(`http://localhost:3000/share/${nonExistentToken}`, { waitUntil: "domcontentloaded" });

    // Assert
    await expect(anonPage.getByTestId("public-note-error-state")).toBeVisible();
    await expect(anonPage.getByTestId("public-note-error-title")).toHaveText("Nie znaleziono");
    await expect(anonPage.getByTestId("public-note-error-description")).toHaveText(
      "Link publiczny nie istnieje lub został wyłączony."
    );
    await expect(anonPage.getByTestId("public-note-error-cta-link")).toBeVisible();

    // Cleanup
    await anonContext.close();
  });

  test("should display 404 error when public link is disabled", async ({ page }) => {
    // Arrange
    const testNote = await createNoteViaAPI(page, {
      original_content: "This note will have its public link disabled.",
      summary_text: "Disabled link test.",
      meeting_date: new Date().toISOString().split("T")[0],
      goal_status: "not_achieved",
      tag_name: "Link Disabled Tests",
      is_ai_generated: false,
    });
    const publicLink = await createPublicLinkViaAPI(page, testNote.id);
    await updatePublicLinkViaAPI(page, testNote.id, { is_enabled: false });
    const browser = page.context().browser();
    if (!browser) throw new Error("Browser not available");
    const anonContext = await browser.newContext();
    const anonPage = await anonContext.newPage();

    // Act
    await anonPage.goto(`http://localhost:3000/share/${publicLink.token}`, { waitUntil: "domcontentloaded" });

    // Assert
    await expect(anonPage.getByTestId("public-note-error-state")).toBeVisible();
    await expect(anonPage.getByTestId("public-note-error-title")).toHaveText("Nie znaleziono");
    await expect(anonPage.getByTestId("public-note-error-description")).toHaveText(
      "Link publiczny nie istnieje lub został wyłączony."
    );
    await expect(anonPage.getByTestId("public-note-error-cta-link")).toBeVisible();

    // Cleanup
    await anonContext.close();
  });
});
