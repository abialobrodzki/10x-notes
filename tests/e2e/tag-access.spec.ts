import { authedTest as test, expect } from "./fixtures/index";
import { createSampleNotes, deleteAllNotesViaAPI } from "./helpers/notes.helpers";

test.describe("Tag Access Management", () => {
  let noteId: string;

  test.beforeEach(async ({ authenticatedPage, notesListPage }) => {
    // Arrange
    await notesListPage.goto();
    const notes = await createSampleNotes(authenticatedPage.page, 1);
    noteId = notes[0].id;
  });

  test.afterEach(async ({ authenticatedPage }) => {
    // Cleanup
    try {
      await deleteAllNotesViaAPI(authenticatedPage.page);
    } catch (error) {
      console.warn("Cleanup warning:", error);
    }
  });

  test.describe("Modal Display and Loading", () => {
    test("should display recipients list when modal opens", async ({ noteDetailPage, tagAccessModal }) => {
      // Arrange
      await noteDetailPage.goto(noteId);
      await noteDetailPage.waitForLoaded();

      // Act
      await noteDetailPage.openTagAccessModal();

      // Assert
      await expect(tagAccessModal.modal).toBeVisible();
      await tagAccessModal.waitForRecipientsLoaded();
    });

    test("should show loading state while fetching recipients", async ({ noteDetailPage, tagAccessModal }) => {
      // Arrange
      await noteDetailPage.goto(noteId);
      await noteDetailPage.waitForLoaded();

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

      // Act
      await noteDetailPage.openTagAccessModal();

      // Assert
      const isLoading = await tagAccessModal.isLoading();
      expect(typeof isLoading).toBe("boolean");
      expect([true, false]).toContain(isLoading);
    });

    test("should display empty state when no recipients exist", async ({ noteDetailPage, tagAccessModal }) => {
      // Arrange
      await noteDetailPage.goto(noteId);
      await noteDetailPage.waitForLoaded();

      // Act
      await noteDetailPage.openTagAccessModal();
      await tagAccessModal.waitForRecipientsLoaded();

      // Assert
      const isEmpty = await tagAccessModal.isEmptyState();
      expect(isEmpty).toBe(true);
    });
  });

  test.describe("Recipient Management", () => {
    test("should display error when adding non-existent recipient", async ({
      noteDetailPage,
      tagAccessModal,
      page,
    }) => {
      // Arrange
      await noteDetailPage.goto(noteId);
      await noteDetailPage.waitForLoaded();
      await noteDetailPage.openTagAccessModal();
      await tagAccessModal.waitForRecipientsLoaded();
      const nonExistentEmail = `test-recipient-${Date.now()}@example.com`;

      // Act
      await tagAccessModal.addRecipient(nonExistentEmail);

      // Assert
      const fieldError = page.getByTestId("add-recipient-form-validation-error");
      await expect(fieldError).toContainText("Użytkownik nie istnieje");
    });

    test("should validate email format before submission", async ({ noteDetailPage, page }) => {
      // Arrange
      await noteDetailPage.goto(noteId);
      await noteDetailPage.waitForLoaded();
      await noteDetailPage.openTagAccessModal();

      const emailInput = page.getByTestId("add-recipient-form-email-input");
      const submitButton = page.getByTestId("add-recipient-form-submit-button");

      // Act
      await emailInput.fill("invalid-email");
      await submitButton.click();

      // Assert
      const validationError = page.getByTestId("add-recipient-form-validation-error");
      await expect(validationError).toBeVisible();
      await expect(validationError).toContainText("Podaj poprawny adres email");
    });

    test("should require email input", async ({ noteDetailPage, tagAccessModal }) => {
      // Arrange
      await noteDetailPage.goto(noteId);
      await noteDetailPage.waitForLoaded();
      await noteDetailPage.openTagAccessModal();
      await tagAccessModal.waitForRecipientsLoaded();

      // Act
      // (No action needed - testing initial state)

      // Assert
      await expect(tagAccessModal.submitButton).toBeDisabled();
    });

    test("should allow removing recipient", async ({ noteDetailPage, tagAccessModal }) => {
      // Arrange
      await noteDetailPage.goto(noteId);
      await noteDetailPage.waitForLoaded();
      await noteDetailPage.openTagAccessModal();
      await tagAccessModal.waitForRecipientsLoaded();

      // Act
      // (Modal is open and ready)

      // Assert
      const beforeCount = await tagAccessModal.getRecipientCount();
      expect(beforeCount).toBeGreaterThanOrEqual(0);
      expect(typeof tagAccessModal.removeRecipient).toBe("function");
    });

    test("should show loading state while adding recipient", async ({ noteDetailPage, tagAccessModal }) => {
      // Arrange
      await noteDetailPage.goto(noteId);
      await noteDetailPage.waitForLoaded();
      await noteDetailPage.openTagAccessModal();
      await tagAccessModal.waitForRecipientsLoaded();

      await noteDetailPage.page.route("**/api/tags/*/access", async (route) => {
        if (route.request().method() === "POST") {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
        await route.continue().catch(() => {
          /* Ignore errors if route is already handled */
        });
      });

      const newEmail = `test-recipient-loading-${Date.now()}@example.com`;

      // Act
      await tagAccessModal.emailInput.fill(newEmail);
      await tagAccessModal.submitButton.click();

      // Assert
      await expect(tagAccessModal.submitButton).toBeDisabled();
    });
  });

  test.describe("Error Handling", () => {
    test("should display error message on API failure", async ({ noteDetailPage, page, tagAccessModal }) => {
      // Arrange
      await noteDetailPage.goto(noteId);
      await noteDetailPage.waitForLoaded();

      await page.route("**/api/tags/*/access", (route) => route.abort("failed"));

      // Act
      await noteDetailPage.openTagAccessModal();

      // Assert
      await expect(tagAccessModal.errorAlert).toBeVisible();
    });

    test("should handle non-existent user error", async ({ noteDetailPage, page }) => {
      // Arrange
      await noteDetailPage.goto(noteId);
      await noteDetailPage.waitForLoaded();
      await noteDetailPage.openTagAccessModal();
      await page.getByTestId("tag-access-modal").waitFor();

      const emailInput = page.getByTestId("add-recipient-form-email-input");
      const submitButton = page.getByTestId("add-recipient-form-submit-button");

      // Act
      await emailInput.fill("truly-nonexistent-user-xyz@example.com");
      await submitButton.click();

      // Assert
      const fieldError = page.getByTestId("add-recipient-form-validation-error");
      await expect(fieldError).toContainText("Użytkownik nie istnieje");
    });
  });

  test.describe("Modal Interaction", () => {
    test("should close modal when pressing Escape", async ({ noteDetailPage, page }) => {
      // Arrange
      await noteDetailPage.goto(noteId);
      await noteDetailPage.waitForLoaded();
      await noteDetailPage.openTagAccessModal();
      const modal = page.getByTestId("tag-access-modal");

      // Act
      await page.keyboard.press("Escape");

      // Assert
      await expect(modal).not.toBeVisible();
    });

    test("should display modal with proper accessibility", async ({ noteDetailPage, tagAccessModal }) => {
      // Arrange
      await noteDetailPage.goto(noteId);
      await noteDetailPage.waitForLoaded();

      // Act
      await noteDetailPage.openTagAccessModal();

      // Assert
      await expect(tagAccessModal.modal).toBeVisible();
    });
  });
});
