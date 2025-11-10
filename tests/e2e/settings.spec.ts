import { authedTest as test, expect } from "./fixtures/index";

test.describe("Settings Page", () => {
  test.beforeEach(async ({ notesPage, settingsPage, user }) => {
    await notesPage.goto();
    await notesPage.waitForUserProfileLoaded(user.email);
    await notesPage.goToSettings();
    await settingsPage.waitForLoaded();
  });

  test("should display profile information", async ({ settingsPage, user }) => {
    await expect(settingsPage.container).toBeVisible();
    await expect(settingsPage.profileSection).toBeVisible();
    await expect(settingsPage.profileEmail).toHaveText(user.email);
  });

  test("should switch between tabs and reveal sections", async ({ settingsPage }) => {
    await settingsPage.switchToTab("stats");
    await expect(settingsPage.statsSection).toBeVisible();
    await expect(settingsPage.statsGrid).toBeVisible();

    await settingsPage.switchToTab("danger");
    await expect(settingsPage.dangerZone).toBeVisible();
  });

  test("should open and close delete account wizard", async ({ settingsPage }) => {
    await settingsPage.switchToTab("danger");
    await settingsPage.openDeleteAccountDialog();
    await expect(settingsPage.deleteAccountDialog).toBeVisible();
    await settingsPage.closeDeleteAccountDialog();
    await expect(settingsPage.deleteAccountDialog).toBeHidden();
  });
});
