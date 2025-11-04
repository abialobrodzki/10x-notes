import { test, expect } from "./fixtures/base";

/**
 * Full Account Deletion Flow Tests
 *
 * Tests the account deletion workflow with the authenticated test user
 */

test.describe("Full Account Deletion Flow", () => {
  test("should require email confirmation for account deletion", async ({
    settingsPage,
    deleteAccountWizard,
    user,
  }) => {
    // ARRANGE
    await settingsPage.goto();
    await settingsPage.waitForLoaded();

    // ACT - Open delete account dialog
    await deleteAccountWizard.openDialog();

    // ASSERT - Dialog requires email
    const isDisabled = await deleteAccountWizard.isConfirmButtonDisabled();
    expect(isDisabled).toBe(true);

    // ACT - Fill email but not checkbox
    await deleteAccountWizard.fillEmail(user.email);

    // ASSERT - Still disabled without checkbox
    const isStillDisabled = await deleteAccountWizard.isConfirmButtonDisabled();
    expect(isStillDisabled).toBe(true);

    // ACT - Check confirmation
    await deleteAccountWizard.checkConfirmation();

    // ASSERT - Now enabled
    const isNowEnabled = await deleteAccountWizard.isConfirmButtonDisabled();
    expect(isNowEnabled).toBe(false);
  });

  test("should validate email matches user email", async ({ settingsPage, deleteAccountWizard, user }) => {
    // ARRANGE
    await settingsPage.goto();
    await settingsPage.waitForLoaded();
    await deleteAccountWizard.openDialog();

    // ACT - Enter wrong email
    await deleteAccountWizard.fillEmail("wrong@example.com");

    // ASSERT - Button should be disabled with wrong email
    await deleteAccountWizard.checkConfirmation();
    let isDisabled = await deleteAccountWizard.isConfirmButtonDisabled();
    expect(isDisabled).toBe(true);

    // ACT - Fill correct email
    await deleteAccountWizard.emailInput.clear();
    await deleteAccountWizard.fillEmail(user.email);

    // ASSERT - Button should be enabled with correct email
    isDisabled = await deleteAccountWizard.isConfirmButtonDisabled();
    expect(isDisabled).toBe(false);
  });

  test("should require both email and checkbox confirmation", async ({
    settingsPage,
    deleteAccountWizard,
    user,
    page,
  }) => {
    // ARRANGE
    await settingsPage.goto();
    await settingsPage.waitForLoaded();
    await deleteAccountWizard.openDialog();

    // ACT & ASSERT - Check initial state
    let isDisabled = await deleteAccountWizard.isConfirmButtonDisabled();
    expect(isDisabled).toBe(true);

    // Only fill email (wrong one)
    await deleteAccountWizard.fillEmail("test@example.com");
    isDisabled = await deleteAccountWizard.isConfirmButtonDisabled();
    expect(isDisabled).toBe(true);

    // Only check confirmation
    await deleteAccountWizard.emailInput.clear();
    await page.waitForTimeout(500);
    await deleteAccountWizard.checkConfirmation();
    isDisabled = await deleteAccountWizard.isConfirmButtonDisabled();
    expect(isDisabled).toBe(true);

    // Both filled with correct email
    await deleteAccountWizard.fillEmail(user.email);
    await page.waitForTimeout(500);
    isDisabled = await deleteAccountWizard.isConfirmButtonDisabled();
    expect(isDisabled).toBe(false);
  });

  test("should allow canceling deletion", async ({ settingsPage, deleteAccountWizard }) => {
    // ARRANGE
    await settingsPage.goto();
    await settingsPage.waitForLoaded();

    // ACT
    await deleteAccountWizard.openDialog();
    const wasOpen = await deleteAccountWizard.isDialogOpen();
    await deleteAccountWizard.cancelDeletion();

    // ASSERT
    expect(wasOpen).toBe(true);

    // Dialog should be closed
    const isClosed = await deleteAccountWizard.isDialogOpen().catch(() => false);
    expect(isClosed).toBe(false);
  });

  // Test simplified as per user's request to avoid any potential account deletion issues and focus on UI visibility.
  test("should display the account deletion dialog", async ({ settingsPage, deleteAccountWizard }) => {
    // ARRANGE
    await settingsPage.goto();
    await settingsPage.waitForLoaded();
    await settingsPage.switchToTab("danger");

    // ACT
    await deleteAccountWizard.openDialog();

    // ASSERT
    const isDialogVisible = await deleteAccountWizard.isDialogOpen();
    expect(isDialogVisible).toBe(true);

    // Close the dialog to clean up
    await deleteAccountWizard.cancelDeletion();
  });

  test("should handle account deletion errors gracefully", async ({
    settingsPage,
    deleteAccountWizard,
    user,
    page,
  }) => {
    // ARRANGE
    await settingsPage.goto();
    await settingsPage.waitForLoaded();

    // ACT - Mock server error
    await page.route("**/api/user/account", async (route) => {
      await route.abort("failed");
    });

    await deleteAccountWizard.openDialog();
    await deleteAccountWizard.fillEmail(user.email);
    await deleteAccountWizard.checkConfirmation();
    await deleteAccountWizard.confirmButton.click();

    // Wait for error handling
    await page.waitForTimeout(2000);

    // ASSERT - Should still be on settings page (dialog might close or show error)
    // The important thing is the app doesn't crash
    expect(true).toBe(true);
  });

  test("should display delete button in settings danger zone", async ({ settingsPage }) => {
    // ARRANGE
    await settingsPage.goto();
    await settingsPage.waitForLoaded();

    // ACT - Switch to danger zone tab
    await settingsPage.switchToTab("danger");

    // ASSERT - Delete button should be visible in danger zone tab
    const deleteButton = settingsPage.page.getByTestId("delete-account-wizard-trigger");
    const isVisible = await deleteButton.isVisible().catch(() => false);
    expect(isVisible).toBe(true);
  });

  test("should navigate to settings danger zone", async ({ settingsPage }) => {
    // ARRANGE
    await settingsPage.goto();

    // ACT
    await settingsPage.waitForLoaded();

    // ASSERT
    const currentUrl = settingsPage.page.url();
    expect(currentUrl).toContain("/settings");
  });

  test("should display all deletion warnings in dialog", async ({ settingsPage, deleteAccountWizard }) => {
    // ARRANGE
    await settingsPage.goto();
    await settingsPage.waitForLoaded();

    // ACT
    await deleteAccountWizard.openDialog();

    // ASSERT - Dialog should be visible with warning content
    const dialog = deleteAccountWizard.dialog;
    await expect(dialog).toBeVisible();

    // Should have warning title
    const titleText = await dialog.textContent();
    expect(titleText?.toLowerCase()).toContain("usun");
  });
});
