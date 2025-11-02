import { type Locator, type Page } from "playwright/test";

type SettingsTab = "profile" | "stats" | "danger";

/**
 * Page Object Model for Settings Page (/settings)
 *
 * Encapsulates tab navigation, key sections, and the delete-account wizard.
 */
export class SettingsPage {
  readonly page: Page;

  readonly container: Locator;
  readonly tabs: Locator;
  readonly profileTab: Locator;
  readonly statsTab: Locator;
  readonly dangerTab: Locator;

  readonly profileSection: Locator;
  readonly profileEmail: Locator;

  readonly statsSection: Locator;
  readonly statsGrid: Locator;

  readonly dangerZone: Locator;
  readonly deleteAccountTrigger: Locator;
  readonly deleteAccountDialog: Locator;
  readonly deleteAccountCancelButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.container = page.getByTestId("settings-page");
    this.tabs = page.getByTestId("settings-page-tabs");
    this.profileTab = page.getByTestId("settings-page-profile-tab");
    this.statsTab = page.getByTestId("settings-page-stats-tab");
    this.dangerTab = page.getByTestId("settings-page-danger-tab");

    this.profileSection = page.getByTestId("profile-section");
    this.profileEmail = page.getByTestId("profile-section-email");

    this.statsSection = page.getByTestId("stats-section");
    this.statsGrid = page.getByTestId("stats-section-grid");

    this.dangerZone = page.getByTestId("danger-zone");
    this.deleteAccountTrigger = page.getByTestId("delete-account-wizard-trigger");
    this.deleteAccountDialog = page.getByTestId("delete-account-wizard-dialog");
    this.deleteAccountCancelButton = page.getByTestId("delete-account-wizard-cancel-button");
  }

  async goto() {
    await this.page.goto("/settings");
  }

  async waitForLoaded() {
    await this.container.waitFor({ state: "visible" });
  }

  async switchToTab(tab: SettingsTab) {
    const mapping: Record<SettingsTab, Locator> = {
      profile: this.profileTab,
      stats: this.statsTab,
      danger: this.dangerTab,
    };

    await mapping[tab].click();
  }

  async openDeleteAccountDialog() {
    await this.deleteAccountTrigger.click();
    await this.deleteAccountDialog.waitFor({ state: "visible" });
  }

  async closeDeleteAccountDialog() {
    if (await this.deleteAccountDialog.isVisible()) {
      await this.deleteAccountCancelButton.click();
      await this.deleteAccountDialog.waitFor({ state: "hidden" });
    }
  }
}
