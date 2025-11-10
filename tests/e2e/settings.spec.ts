import { authedTest as test, expect } from "./fixtures/index";

test.describe("Settings Page", () => {
  test.beforeEach(async ({ notesPage, settingsPage, user }) => {
    await notesPage.goto();
    await notesPage.waitForUserProfileLoaded(user.email);
    await notesPage.goToSettings();
    await settingsPage.waitForLoaded();
  });

  test("should display profile information", async ({ settingsPage, user }) => {
    // Arrange
    // (Setup done in beforeEach)

    // Act
    // (Page is already loaded in beforeEach)

    // Assert
    await expect(settingsPage.container).toBeVisible();
    await expect(settingsPage.profileSection).toBeVisible();
    await expect(settingsPage.profileEmail).toHaveText(user.email);
  });

  test("should switch between tabs and reveal sections", async ({ settingsPage }) => {
    // Arrange
    // (Page is already loaded in beforeEach)

    // Act & Assert - Stats tab
    await settingsPage.switchToTab("stats");
    await expect(settingsPage.statsSection).toBeVisible();
    await expect(settingsPage.statsGrid).toBeVisible();

    // Act & Assert - Danger tab
    await settingsPage.switchToTab("danger");
    await expect(settingsPage.dangerZone).toBeVisible();
  });

  test("should open and close delete account wizard", async ({ settingsPage }) => {
    // Arrange
    await settingsPage.switchToTab("danger");

    // Act
    await settingsPage.openDeleteAccountDialog();

    // Assert
    await expect(settingsPage.deleteAccountDialog).toBeVisible();

    // Act
    await settingsPage.closeDeleteAccountDialog();

    // Assert
    await expect(settingsPage.deleteAccountDialog).toBeHidden();
  });
});
