import { type Locator, type Page } from "playwright/test";

/**
 * Page Object Model for Tag Access Modal
 *
 * Manages tag access control - adding/removing recipient access
 */
export class TagAccessModalPOM {
  readonly page: Page;

  readonly modal: Locator;
  readonly errorAlert: Locator;
  readonly recipientsList: Locator;
  readonly recipientsListLoading: Locator;
  readonly recipientsListEmpty: Locator;
  readonly recipientsListItems: Locator;
  readonly addRecipientForm: Locator;
  readonly emailInput: Locator;
  readonly validationError: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.modal = page.getByTestId("tag-access-modal");
    this.errorAlert = page.getByTestId("tag-access-modal-error");
    this.recipientsList = page.getByTestId("recipients-list");
    this.recipientsListLoading = page.getByTestId("recipients-list-loading");
    this.recipientsListEmpty = page.getByTestId("recipients-list-empty");
    this.recipientsListItems = page.getByTestId("recipients-list-items");
    this.addRecipientForm = page.getByTestId("add-recipient-form");
    this.emailInput = page.getByTestId("add-recipient-form-email-input");
    this.validationError = page.getByTestId("add-recipient-form-validation-error");
    this.submitButton = page.getByTestId("add-recipient-form-submit-button");
  }

  async waitForLoaded() {
    await this.modal.waitFor({ state: "visible" });
  }

  async isLoading() {
    return await this.recipientsListLoading.isVisible().catch(() => false);
  }

  async waitForRecipientsLoaded() {
    // Wait for either recipients list or empty state to be visible
    await Promise.race([
      this.recipientsList.waitFor({ state: "visible" }).catch(() => {
        // Recipients list not visible
      }),
      this.recipientsListEmpty.waitFor({ state: "visible" }).catch(() => {
        // Empty state not visible
      }),
    ]);
  }

  async getRecipientCount() {
    const items = await this.recipientsListItems.locator("[data-testid='recipient-item']").count();
    return items;
  }

  async hasRecipients() {
    return await this.recipientsListItems.isVisible().catch(() => false);
  }

  async isEmptyState() {
    return await this.recipientsListEmpty.isVisible().catch(() => false);
  }

  async getRecipientEmails(): Promise<string[]> {
    const emailElements = this.page.locator("[data-testid='recipient-item-email']");
    const count = await emailElements.count();
    const emails = [];

    for (let i = 0; i < count; i++) {
      const email = await emailElements.nth(i).textContent();
      if (email) emails.push(email);
    }

    return emails;
  }

  async addRecipient(email: string) {
    await this.emailInput.fill(email);
    await this.submitButton.click();
  }

  async removeRecipient(email: string) {
    // Wait for recipient items to be present
    await this.recipientsListItems.waitFor({ state: "visible" }).catch(() => {
      // Items might not be visible, will check count
    });

    // Find all recipient items and locate the one with matching email
    const recipientItems = this.page.locator("[data-testid='recipient-item']");
    let count = await recipientItems.count();

    // If no items found initially, wait a bit and try again
    if (count === 0) {
      await this.page.waitForTimeout(300);
      count = await recipientItems.count();
    }

    for (let i = 0; i < count; i++) {
      const item = recipientItems.nth(i);
      const emailElement = item.locator("[data-testid='recipient-item-email']");
      const emailText = await emailElement.textContent();

      // Normalize and compare emails (trim whitespace)
      if (emailText?.trim().includes(email.trim())) {
        const removeButton = item.locator("[data-testid='recipient-item-remove-button']");
        await removeButton.click();
        return;
      }
    }

    // If still not found, try alternative approach - look for the email anywhere
    const allEmails = await this.getRecipientEmails();
    if (allEmails.length === 0) {
      throw new Error(`Recipient with email ${email} not found. No recipients in the list (count=${count})`);
    }

    throw new Error(`Recipient with email ${email} not found. Available recipients: ${allEmails.join(", ")}`);
  }

  async clearEmailInput() {
    await this.emailInput.clear();
  }

  async getValidationError(): Promise<string | null> {
    return await this.validationError.textContent().catch(() => null);
  }

  async hasError() {
    return await this.errorAlert.isVisible().catch(() => false);
  }

  async getErrorMessage(): Promise<string | null> {
    return await this.errorAlert.textContent().catch(() => null);
  }

  async isSubmitButtonDisabled() {
    return await this.submitButton.isDisabled();
  }

  async isSubmitButtonLoading() {
    const text = await this.submitButton.textContent();
    return text?.includes("Dodawanie") || false;
  }

  async close() {
    // Press Escape or click outside modal (ESC key handling)
    await this.page.keyboard.press("Escape");
  }
}
