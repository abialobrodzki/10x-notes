import { test, expect } from "./fixtures/base";
import { requireE2EUserCredentials } from "./helpers/env.helpers";

test.describe("Settings Page", () => {
  const { email } = requireE2EUserCredentials();

  test.beforeEach(async ({ notesPage, settingsPage }) => {
    await notesPage.goto();
    await notesPage.waitForUserProfileLoaded(email);
    await notesPage.goToSettings();
    await settingsPage.waitForLoaded();
  });

  test("should display profile information", async ({ settingsPage }) => {
    await expect(settingsPage.container).toBeVisible();
    await expect(settingsPage.profileSection).toBeVisible();
    await expect(settingsPage.profileEmail).toHaveText(email);
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
