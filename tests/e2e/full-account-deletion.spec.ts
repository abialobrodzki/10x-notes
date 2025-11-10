import { authedTest as test, expect } from "./fixtures/index";

/**
 * Full Account Deletion Flow Tests
 */
test.describe("Full Account Deletion Flow", () => {
  test("should require email confirmation for account deletion", async ({
    settingsPage,
    deleteAccountWizard,
    user,
  }) => {
    // Arrange
    await settingsPage.goto();
    await settingsPage.waitForLoaded();
    await deleteAccountWizard.openDialog();

    // Assert - Initial state
    await expect(deleteAccountWizard.confirmButton).toBeDisabled();

    // Act - Fill email only
    await deleteAccountWizard.fillEmail(user.email);

    // Assert - Still disabled without checkbox
    await expect(deleteAccountWizard.confirmButton).toBeDisabled();

    // Act - Check confirmation
    await deleteAccountWizard.checkConfirmation();

    // Assert - Now enabled
    await expect(deleteAccountWizard.confirmButton).toBeEnabled();
  });

  test("should validate email matches user email", async ({ settingsPage, deleteAccountWizard, user }) => {
    // Arrange
    await settingsPage.goto();
    await settingsPage.waitForLoaded();
    await deleteAccountWizard.openDialog();

    // Act - Fill wrong email and check confirmation
    await deleteAccountWizard.fillEmail("wrong@example.com");
    await deleteAccountWizard.checkConfirmation();

    // Assert - Button disabled with wrong email
    await expect(deleteAccountWizard.confirmButton).toBeDisabled();

    // Act - Fill correct email
    await deleteAccountWizard.emailInput.clear();
    await deleteAccountWizard.fillEmail(user.email);

    // Assert - Button enabled with correct email
    await expect(deleteAccountWizard.confirmButton).toBeEnabled();
  });

  test("should require both email and checkbox confirmation", async ({ settingsPage, deleteAccountWizard, user }) => {
    // Arrange
    await settingsPage.goto();
    await settingsPage.waitForLoaded();
    await deleteAccountWizard.openDialog();

    // Assert - Initial state
    await expect(deleteAccountWizard.confirmButton).toBeDisabled();

    // Act - Fill wrong email only
    await deleteAccountWizard.fillEmail("test@example.com");

    // Assert - Still disabled
    await expect(deleteAccountWizard.confirmButton).toBeDisabled();

    // Act - Clear email and check confirmation only
    await deleteAccountWizard.emailInput.clear();
    await deleteAccountWizard.checkConfirmation();

    // Assert - Still disabled without correct email
    await expect(deleteAccountWizard.confirmButton).toBeDisabled();

    // Act - Fill correct email (checkbox already checked)
    await deleteAccountWizard.fillEmail(user.email);

    // Assert - Now enabled with both requirements met
    await expect(deleteAccountWizard.confirmButton).toBeEnabled();
  });

  test("should allow canceling deletion", async ({ settingsPage, deleteAccountWizard }) => {
    // Arrange
    await settingsPage.goto();
    await settingsPage.waitForLoaded();
    await deleteAccountWizard.openDialog();
    await expect(deleteAccountWizard.dialog).toBeVisible();

    // Act
    await deleteAccountWizard.cancelDeletion();

    // Assert
    await expect(deleteAccountWizard.dialog).not.toBeVisible();
  });

  test("should display the account deletion dialog", async ({ settingsPage, deleteAccountWizard }) => {
    // Arrange
    await settingsPage.goto();
    await settingsPage.waitForLoaded();
    await settingsPage.switchToTab("danger");

    // Act
    await deleteAccountWizard.openDialog();

    // Assert
    await expect(deleteAccountWizard.dialog).toBeVisible();

    // Cleanup
    await deleteAccountWizard.cancelDeletion();
  });

  test("should handle account deletion errors gracefully", async ({
    settingsPage,
    deleteAccountWizard,
    user,
    page,
  }) => {
    // Arrange
    await settingsPage.goto();
    await settingsPage.waitForLoaded();
    await page.route("**/api/user/account", (route) => route.abort("failed"));
    await deleteAccountWizard.openDialog();
    await deleteAccountWizard.fillEmail(user.email);
    await deleteAccountWizard.checkConfirmation();

    // Act
    await deleteAccountWizard.confirmButton.click();

    // Assert - The app should not crash, and the UI should recover
    await expect(deleteAccountWizard.dialog).toBeVisible();
    await expect(deleteAccountWizard.confirmButton).toBeEnabled();
    await expect(deleteAccountWizard.confirmButton).toContainText("Usuń konto na zawsze");
  });

  test("should display delete button in settings danger zone", async ({ settingsPage }) => {
    // Arrange
    await settingsPage.goto();
    await settingsPage.waitForLoaded();

    // Act
    await settingsPage.switchToTab("danger");

    // Assert
    const deleteButton = settingsPage.page.getByTestId("delete-account-wizard-trigger");
    await expect(deleteButton).toBeVisible();
  });

  test("should navigate to settings danger zone", async ({ settingsPage }) => {
    // Act
    await settingsPage.goto();
    await settingsPage.waitForLoaded();

    // Assert
    const currentUrl = settingsPage.page.url();
    expect(currentUrl).toContain("/settings");
  });

  test("should display all deletion warnings in dialog", async ({ settingsPage, deleteAccountWizard }) => {
    // Arrange
    await settingsPage.goto();
    await settingsPage.waitForLoaded();

    // Act
    await deleteAccountWizard.openDialog();

    // Assert
    await expect(deleteAccountWizard.dialog).toBeVisible();
    await expect(deleteAccountWizard.dialog).toContainText("usun");
  });
});
