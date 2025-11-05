import { RecipientEmail } from "./recipient-email";
import { TagAccess } from "./tag-access";

/**
 * Tag Aggregate Root
 *
 * The Tag is the central aggregate in the Sharing domain.
 * It contains all business logic for managing who has access to a tag.
 *
 * Key responsibilities:
 * - Maintain the list of users who have access (through TagAccess entities)
 * - Validate that operations are performed only by the tag owner
 * - Enforce business rules (no self-sharing, no duplicate access, etc.)
 */
export class Tag {
  private readonly _id: string;
  private readonly _ownerId: string;
  private _name: string;
  private _accessList: TagAccess[];
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  /**
   * Create a new Tag aggregate
   *
   * @param id - Tag ID
   * @param ownerId - User ID of the tag owner
   * @param name - Tag name
   * @param accessList - Array of TagAccess entities
   * @param createdAt - When the tag was created
   * @param updatedAt - When the tag was last updated
   */
  constructor(
    id: string,
    ownerId: string,
    name: string,
    accessList: TagAccess[] = [],
    createdAt: Date | string = new Date(),
    updatedAt: Date | string = new Date()
  ) {
    this._id = id;
    this._ownerId = ownerId;
    this._name = name;
    this._accessList = accessList;
    this._createdAt = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
    this._updatedAt = typeof updatedAt === "string" ? new Date(updatedAt) : updatedAt;
  }

  // ============================================================================
  // Query Methods (Getters)
  // ============================================================================

  get id(): string {
    return this._id;
  }

  get ownerId(): string {
    return this._ownerId;
  }

  get name(): string {
    return this._name;
  }

  get accessList(): readonly TagAccess[] {
    return this._accessList;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * Get the number of users with access to this tag
   */
  getAccessCount(): number {
    return this._accessList.length;
  }

  /**
   * Check if a specific user has access to this tag
   *
   * @param recipientId - User ID to check
   * @returns true if the user has access, false otherwise
   */
  hasAccess(recipientId: string): boolean {
    return this._accessList.some((access) => access.isForRecipient(recipientId));
  }

  /**
   * Check if the given user is the owner of this tag
   *
   * @param userId - User ID to check
   * @returns true if the user is the owner, false otherwise
   */
  isOwnedBy(userId: string): boolean {
    return this._ownerId === userId;
  }

  // ============================================================================
  // Business Logic Methods (Commands)
  // ============================================================================

  /**
   * Grant access to this tag to a user
   *
   * Business rules:
   * - Only the tag owner can grant access
   * - Cannot grant access if the recipient already has it (no duplicates)
   * - Cannot grant access to the owner themselves
   *
   * @param recipientId - User ID of the recipient
   * @param recipientEmail - Email of the recipient
   * @param currentUserId - User ID performing the grant operation
   * @throws Error if any business rule is violated
   */
  grantAccess(recipientId: string, recipientEmail: RecipientEmail, currentUserId: string): void {
    // Validate ownership
    if (!this.isOwnedBy(currentUserId)) {
      throw new Error("TAG_NOT_OWNED: Only the tag owner can grant access");
    }

    // Validate self-sharing
    if (recipientId === currentUserId) {
      throw new Error("CANNOT_SHARE_WITH_SELF: You cannot grant access to your own tag");
    }

    // Validate no duplicate access
    if (this.hasAccess(recipientId)) {
      throw new Error("DUPLICATE_ACCESS: This recipient already has access to this tag");
    }

    // Create and add the new access record
    const newAccess = new TagAccess(recipientId, recipientEmail, new Date());
    this._accessList.push(newAccess);

    // Update timestamp
    this._updatedAt = new Date();
  }

  /**
   * Revoke access from a user
   *
   * Business rules:
   * - Only the tag owner can revoke access
   * - The recipient must have access to revoke it
   *
   * @param recipientId - User ID of the recipient whose access should be revoked
   * @param currentUserId - User ID performing the revoke operation
   * @throws Error if any business rule is violated
   */
  revokeAccess(recipientId: string, currentUserId: string): void {
    // Validate ownership
    if (!this.isOwnedBy(currentUserId)) {
      throw new Error("TAG_NOT_OWNED: Only the tag owner can revoke access");
    }

    // Find and remove the access record
    const initialLength = this._accessList.length;
    this._accessList = this._accessList.filter((access) => !access.isForRecipient(recipientId));

    // Check if we actually removed something
    if (this._accessList.length === initialLength) {
      throw new Error("ACCESS_NOT_FOUND: This recipient does not have access to this tag");
    }

    // Update timestamp
    this._updatedAt = new Date();
  }

  /**
   * Get all access records for this tag
   *
   * @param currentUserId - User ID requesting the access list
   * @returns Array of access records
   * @throws Error if the user is not the owner
   */
  getAccessList(currentUserId: string): readonly TagAccess[] {
    // Validate ownership
    if (!this.isOwnedBy(currentUserId)) {
      throw new Error("TAG_NOT_OWNED: Only the tag owner can view the access list");
    }

    return this._accessList;
  }

  /**
   * Update the tag name
   *
   * Business rules:
   * - Only the tag owner can update it
   *
   * @param newName - New tag name
   * @param currentUserId - User ID performing the update
   * @throws Error if the user is not the owner
   */
  updateName(newName: string, currentUserId: string): void {
    if (!this.isOwnedBy(currentUserId)) {
      throw new Error("TAG_NOT_OWNED: Only the tag owner can update the tag");
    }

    this._name = newName;
    this._updatedAt = new Date();
  }
}
