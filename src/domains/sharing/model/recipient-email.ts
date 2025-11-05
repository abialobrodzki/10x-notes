/**
 * RecipientEmail Value Object
 *
 * Represents an email address for a tag access recipient.
 * Validates that the email format is correct on construction.
 */
export class RecipientEmail {
  private readonly _value: string;

  /**
   * Create a new RecipientEmail value object
   *
   * @param value - Email string to validate and store
   * @throws Error if email format is invalid
   */
  constructor(value: string) {
    if (!this.isValidEmail(value)) {
      throw new Error(`INVALID_EMAIL: "${value}" is not a valid email address`);
    }
    this._value = value.toLowerCase();
  }

  /**
   * Get the email value
   */
  get value(): string {
    return this._value;
  }

  /**
   * Validate email format using a simple regex pattern
   * Matches basic email format: something@domain.extension
   */
  private isValidEmail(email: string): boolean {
    if (!email || typeof email !== "string") {
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Check if this email equals another email
   */
  equals(other: RecipientEmail): boolean {
    return this._value === other._value;
  }

  /**
   * String representation
   */
  toString(): string {
    return this._value;
  }
}
