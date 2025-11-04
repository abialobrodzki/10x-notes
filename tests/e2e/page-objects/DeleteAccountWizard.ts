import { type Locator, type Page } from "playwright/test";

/**
 * Page Object Model for Delete Account Wizard
 *
 * Manages account deletion flow with email confirmation and checkbox
 */
export class DeleteAccountWizardPOM {
  readonly page: Page;

  readonly triggerButton: Locator;
  readonly dialog: Locator;
  readonly emailInput: Locator;
  readonly emailError: Locator;
  readonly confirmCheckbox: Locator;
  readonly cancelButton: Locator;
  readonly confirmButton: Locator;
  readonly dangerTab: Locator;

  constructor(page: Page) {
    this.page = page;

    this.triggerButton = page.getByTestId("delete-account-wizard-trigger");
    this.dialog = page.getByTestId("delete-account-wizard-dialog");
    this.emailInput = page.getByTestId("delete-account-wizard-email-input");
    this.emailError = page.getByTestId("delete-account-wizard-email-error");
    this.confirmCheckbox = page.getByTestId("delete-account-wizard-confirm-checkbox");
    this.cancelButton = page.getByTestId("delete-account-wizard-cancel-button");
    this.confirmButton = page.getByTestId("delete-account-wizard-confirm-button");
    this.dangerTab = page.getByTestId("settings-page-danger-tab");
  }

  async openDialog() {
    // First switch to danger zone tab if not already there
    const isVisible = await this.triggerButton.isVisible().catch(() => false);
    if (!isVisible) {
      await this.dangerTab.click();
      await this.page.waitForTimeout(300);
    }

    await this.triggerButton.click();
    await this.dialog.waitFor({ state: "visible" });
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async checkConfirmation() {
    await this.confirmCheckbox.check();
  }

  async uncheckConfirmation() {
    await this.confirmCheckbox.uncheck();
  }

  async isConfirmationChecked() {
    return await this.confirmCheckbox.isChecked();
  }

  async getEmailError(): Promise<string | null> {
    return await this.emailError.textContent().catch(() => null);
  }

  async hasEmailError() {
    return await this.emailError.isVisible().catch(() => false);
  }

  async deleteAccount(email: string) {
    await this.fillEmail(email);
    await this.checkConfirmation();
    await this.confirmButton.click();
  }

  async cancelDeletion() {
    await this.cancelButton.click();
    await this.dialog.waitFor({ state: "hidden" });
  }

  async isDialogOpen() {
    return await this.dialog.isVisible().catch(() => false);
  }

  async isConfirmButtonDisabled() {
    return await this.confirmButton.isDisabled();
  }

  async isConfirmButtonLoading() {
    const text = await this.confirmButton.textContent();
    return text?.includes("Usuwanie") || false;
  }

  async waitForDeletion() {
    // Wait for the dialog to close or for a redirect
    await this.dialog.waitFor({ state: "hidden" }).catch(() => {
      // Dialog already hidden or failed to wait
    });
  }
}
