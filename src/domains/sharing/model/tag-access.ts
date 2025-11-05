import type { RecipientEmail } from "./recipient-email";

/**
 * TagAccess Entity
 *
 * Represents a single instance of a user having access to a tag.
 * This is a child entity within the Tag aggregate.
 */
export class TagAccess {
  private readonly _recipientId: string;
  private readonly _recipientEmail: RecipientEmail;
  private readonly _grantedAt: Date;

  /**
   * Create a new TagAccess entity
   *
   * @param recipientId - User ID of the recipient who has access
   * @param recipientEmail - Email address of the recipient
   * @param grantedAt - Timestamp when access was granted (ISO string or Date)
   */
  constructor(recipientId: string, recipientEmail: RecipientEmail, grantedAt: Date | string) {
    this._recipientId = recipientId;
    this._recipientEmail = recipientEmail;
    this._grantedAt = typeof grantedAt === "string" ? new Date(grantedAt) : grantedAt;
  }

  /**
   * Get the recipient's user ID
   */
  get recipientId(): string {
    return this._recipientId;
  }

  /**
   * Get the recipient's email
   */
  get recipientEmail(): RecipientEmail {
    return this._recipientEmail;
  }

  /**
   * Get when access was granted
   */
  get grantedAt(): Date {
    return this._grantedAt;
  }

  /**
   * Check if this access is for the given recipient ID
   */
  isForRecipient(recipientId: string): boolean {
    return this._recipientId === recipientId;
  }

  /**
   * Check if this access is for the given email
   */
  isForEmail(email: RecipientEmail): boolean {
    return this._recipientEmail.equals(email);
  }
}
