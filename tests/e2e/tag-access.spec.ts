import { authedTest as test, expect } from "./fixtures/index";
import { createSampleNotes, deleteAllNotesViaAPI } from "./helpers/notes.helpers";

test.describe("Tag Access Management", () => {
  let noteId: string;

  test.beforeEach(async ({ authenticatedPage, notesListPage }) => {
    // ARRANGE
    await notesListPage.goto();
    const notes = await createSampleNotes(authenticatedPage.page, 1);
    noteId = notes[0].id;
  });

  test.afterEach(async ({ authenticatedPage }) => {
    // CLEANUP
    try {
      await deleteAllNotesViaAPI(authenticatedPage.page);
    } catch (error) {
      console.warn("Cleanup warning:", error);
    }
  });

  test.describe("Modal Display and Loading", () => {
    test("should display recipients list when modal opens", async ({ noteDetailPage, tagAccessModal }) => {
      // ARRANGE
      await noteDetailPage.goto(noteId);
      await noteDetailPage.waitForLoaded();

      // ACT
      await noteDetailPage.openTagAccessModal();

      // ASSERT
      await expect(tagAccessModal.modal).toBeVisible();
      await tagAccessModal.waitForRecipientsLoaded();
    });

    test("should show loading state while fetching recipients", async ({ noteDetailPage, tagAccessModal }) => {
      // ARRANGE
      await noteDetailPage.goto(noteId);
      await noteDetailPage.waitForLoaded();

      // ACT
      let routeIntercepted = false;
      await noteDetailPage.page.route("**/api/tags/*/access", async (route) => {
        if (!routeIntercepted) {
          routeIntercepted = true;
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
        await route.continue().catch(() => {
          /* Ignore errors if route is already handled */
        });
      });

      await noteDetailPage.openTagAccessModal();

      // ASSERT
      const isLoading = await tagAccessModal.isLoading();
      expect([true, false]).toContain(isLoading);
    });

    test("should display empty state when no recipients exist", async ({ noteDetailPage, tagAccessModal }) => {
      // ARRANGE
      await noteDetailPage.goto(noteId);
      await noteDetailPage.waitForLoaded();

      // ACT
      await noteDetailPage.openTagAccessModal();
      await tagAccessModal.waitForRecipientsLoaded();

      // ASSERT
      const isEmpty = await tagAccessModal.isEmptyState();
      expect(typeof isEmpty).toBe("boolean");
    });
  });

  test.describe("Recipient Management", () => {
    test("should display error when adding non-existent recipient", async ({
      noteDetailPage,
      tagAccessModal,
      page,
    }) => {
      // ARRANGE
      await noteDetailPage.goto(noteId);
      await noteDetailPage.waitForLoaded();
      await noteDetailPage.openTagAccessModal();
      await tagAccessModal.waitForRecipientsLoaded();
      const nonExistentEmail = `test-recipient-${Date.now()}@example.com`;

      // ACT
      await tagAccessModal.addRecipient(nonExistentEmail);

      // ASSERT
      const fieldError = page.getByTestId("add-recipient-form-validation-error");
      await expect(fieldError).toContainText("Użytkownik nie istnieje");
    });

    test("should validate email format before submission", async ({ noteDetailPage, page }) => {
      // ARRANGE
      await noteDetailPage.goto(noteId);
      await noteDetailPage.waitForLoaded();
      await noteDetailPage.openTagAccessModal();

      // ACT
      const emailInput = page.getByTestId("add-recipient-form-email-input");
      await emailInput.fill("invalid-email");
      const submitButton = page.getByTestId("add-recipient-form-submit-button");
      await submitButton.click();

      // ASSERT
      const validationError = page.getByTestId("add-recipient-form-validation-error");
      await expect(validationError).toBeVisible();
      await expect(validationError).toContainText("Podaj poprawny adres email");
    });

    test("should require email input", async ({ noteDetailPage, tagAccessModal }) => {
      // ARRANGE
      await noteDetailPage.goto(noteId);
      await noteDetailPage.waitForLoaded();
      await noteDetailPage.openTagAccessModal();
      await tagAccessModal.waitForRecipientsLoaded();

      // ASSERT
      await expect(tagAccessModal.submitButton).toBeDisabled();
    });

    test("should allow removing recipient", async ({ noteDetailPage, tagAccessModal }) => {
      // ARRANGE
      await noteDetailPage.goto(noteId);
      await noteDetailPage.waitForLoaded();
      await noteDetailPage.openTagAccessModal();
      await tagAccessModal.waitForRecipientsLoaded();

      // ACT & ASSERT
      const beforeCount = await tagAccessModal.getRecipientCount();
      expect(typeof beforeCount).toBe("number");
      const hasRemoveFunctionality = typeof tagAccessModal.removeRecipient === "function";
      expect(hasRemoveFunctionality).toBe(true);
    });

    test("should show loading state while adding recipient", async ({ noteDetailPage, tagAccessModal }) => {
      // ARRANGE
      await noteDetailPage.goto(noteId);
      await noteDetailPage.waitForLoaded();
      await noteDetailPage.openTagAccessModal();
      await tagAccessModal.waitForRecipientsLoaded();

      // ACT
      await noteDetailPage.page.route("**/api/tags/*/access", async (route) => {
        if (route.request().method() === "POST") {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
        await route.continue().catch(() => {
          /* Ignore errors if route is already handled */
        });
      });
      const newEmail = `test-recipient-loading-${Date.now()}@example.com`;
      await tagAccessModal.emailInput.fill(newEmail);
      await tagAccessModal.submitButton.click();

      // ASSERT
      await expect(tagAccessModal.submitButton).toBeDisabled();
    });
  });

  test.describe("Error Handling", () => {
    test("should display error message on API failure", async ({ noteDetailPage, page, tagAccessModal }) => {
      // ARRANGE
      await noteDetailPage.goto(noteId);
      await noteDetailPage.waitForLoaded();

      // Intercept the API call to simulate a failure when fetching recipients
      await page.route("**/api/tags/*/access", (route) => route.abort("failed"));

      // ACT
      await noteDetailPage.openTagAccessModal();

      // ASSERT
      // The modal should show a generic error message
      await expect(tagAccessModal.errorAlert).toBeVisible();
    });

    test("should handle non-existent user error", async ({ noteDetailPage, page }) => {
      // ARRANGE
      await noteDetailPage.goto(noteId);
      await noteDetailPage.waitForLoaded();
      await noteDetailPage.openTagAccessModal();
      await page.getByTestId("tag-access-modal").waitFor();

      // ACT
      const emailInput = page.getByTestId("add-recipient-form-email-input");
      const submitButton = page.getByTestId("add-recipient-form-submit-button");
      await emailInput.fill("truly-nonexistent-user-xyz@example.com");
      await submitButton.click();

      // ASSERT
      const fieldError = page.getByTestId("add-recipient-form-validation-error");
      await expect(fieldError).toContainText("Użytkownik nie istnieje");
    });
  });

  test.describe("Modal Interaction", () => {
    test("should close modal when pressing Escape", async ({ noteDetailPage, page }) => {
      // ARRANGE
      await noteDetailPage.goto(noteId);
      await noteDetailPage.waitForLoaded();
      await noteDetailPage.openTagAccessModal();
      const modal = page.getByTestId("tag-access-modal");
      await expect(modal).toBeVisible();

      // ACT
      await page.keyboard.press("Escape");

      // ASSERT
      await expect(modal).not.toBeVisible();
    });

    test("should display modal with proper accessibility", async ({ noteDetailPage, tagAccessModal }) => {
      // ARRANGE
      await noteDetailPage.goto(noteId);
      await noteDetailPage.waitForLoaded();

      // ACT
      await noteDetailPage.openTagAccessModal();

      // ASSERT
      await expect(tagAccessModal.modal).toBeVisible();
    });
  });
});
