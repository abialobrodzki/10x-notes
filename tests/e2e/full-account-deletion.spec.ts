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
    await settingsPage.goto();
    await settingsPage.waitForLoaded();
    await deleteAccountWizard.openDialog();

    await expect(deleteAccountWizard.confirmButton).toBeDisabled();

    await deleteAccountWizard.fillEmail(user.email);
    await expect(deleteAccountWizard.confirmButton).toBeDisabled();

    await deleteAccountWizard.checkConfirmation();
    await expect(deleteAccountWizard.confirmButton).toBeEnabled();
  });

  test("should validate email matches user email", async ({ settingsPage, deleteAccountWizard, user }) => {
    await settingsPage.goto();
    await settingsPage.waitForLoaded();
    await deleteAccountWizard.openDialog();

    await deleteAccountWizard.fillEmail("wrong@example.com");
    await deleteAccountWizard.checkConfirmation();
    await expect(deleteAccountWizard.confirmButton).toBeDisabled();

    await deleteAccountWizard.emailInput.clear();
    await deleteAccountWizard.fillEmail(user.email);
    await expect(deleteAccountWizard.confirmButton).toBeEnabled();
  });

  test("should require both email and checkbox confirmation", async ({ settingsPage, deleteAccountWizard, user }) => {
    await settingsPage.goto();
    await settingsPage.waitForLoaded();
    await deleteAccountWizard.openDialog();

    await expect(deleteAccountWizard.confirmButton).toBeDisabled();

    await deleteAccountWizard.fillEmail("test@example.com");
    await expect(deleteAccountWizard.confirmButton).toBeDisabled();

    await deleteAccountWizard.emailInput.clear();
    await deleteAccountWizard.checkConfirmation();
    await expect(deleteAccountWizard.confirmButton).toBeDisabled();

    await deleteAccountWizard.fillEmail(user.email);
    await expect(deleteAccountWizard.confirmButton).toBeEnabled();
  });

  test("should allow canceling deletion", async ({ settingsPage, deleteAccountWizard }) => {
    await settingsPage.goto();
    await settingsPage.waitForLoaded();

    await deleteAccountWizard.openDialog();
    await expect(deleteAccountWizard.dialog).toBeVisible();

    await deleteAccountWizard.cancelDeletion();
    await expect(deleteAccountWizard.dialog).not.toBeVisible();
  });

  test("should display the account deletion dialog", async ({ settingsPage, deleteAccountWizard }) => {
    await settingsPage.goto();
    await settingsPage.waitForLoaded();
    await settingsPage.switchToTab("danger");

    await deleteAccountWizard.openDialog();

    await expect(deleteAccountWizard.dialog).toBeVisible();

    await deleteAccountWizard.cancelDeletion();
  });

  test("should handle account deletion errors gracefully", async ({
    settingsPage,
    deleteAccountWizard,
    user,
    page,
  }) => {
    await settingsPage.goto();
    await settingsPage.waitForLoaded();

    await page.route("**/api/user/account", (route) => route.abort("failed"));

    await deleteAccountWizard.openDialog();
    await deleteAccountWizard.fillEmail(user.email);
    await deleteAccountWizard.checkConfirmation();
    await deleteAccountWizard.confirmButton.click();

    // ASSERT - The app should not crash, and the UI should recover.
    // The dialog should still be open.
    await expect(deleteAccountWizard.dialog).toBeVisible();
    // The confirm button should no longer be in a loading state.
    await expect(deleteAccountWizard.confirmButton).toBeEnabled();
    await expect(deleteAccountWizard.confirmButton).toContainText("Usuń konto na zawsze");
  });

  test("should display delete button in settings danger zone", async ({ settingsPage }) => {
    await settingsPage.goto();
    await settingsPage.waitForLoaded();
    await settingsPage.switchToTab("danger");

    const deleteButton = settingsPage.page.getByTestId("delete-account-wizard-trigger");
    await expect(deleteButton).toBeVisible();
  });

  test("should navigate to settings danger zone", async ({ settingsPage }) => {
    await settingsPage.goto();
    await settingsPage.waitForLoaded();
    const currentUrl = settingsPage.page.url();
    expect(currentUrl).toContain("/settings");
  });

  test("should display all deletion warnings in dialog", async ({ settingsPage, deleteAccountWizard }) => {
    await settingsPage.goto();
    await settingsPage.waitForLoaded();
    await deleteAccountWizard.openDialog();

    await expect(deleteAccountWizard.dialog).toBeVisible();
    await expect(deleteAccountWizard.dialog).toContainText("usun");
  });
});
