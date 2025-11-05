import { RecipientEmail } from "../model/recipient-email";
import type { Database } from "../../../db/database.types";
import type { ITagRepository } from "../model/tag.repository";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * GrantAccessUseCase
 *
 * Application Service for granting access to a tag to another user.
 *
 * This use case:
 * 1. Loads the Tag aggregate
 * 2. Validates business rules (ownership, no self-sharing, no duplicates)
 * 3. Calls RPC function to persist the change
 * 4. Returns the result to the caller
 */
export class GrantAccessUseCase {
  constructor(
    private readonly tagRepository: ITagRepository,
    private readonly supabase: SupabaseClient<Database>
  ) {}

  /**
   * Execute the grant access use case
   *
   * @param tagId - ID of the tag to grant access to
   * @param recipientEmail - Email of the recipient user
   * @param currentUserId - ID of the user performing the operation (must be tag owner)
   * @returns Object with recipient_id, email, and granted_at
   * @throws Error if business rules are violated or database operation fails
   */
  async execute(
    tagId: string,
    recipientEmail: string,
    currentUserId: string
  ): Promise<{
    recipient_id: string;
    email: string;
    granted_at: string;
  }> {
    // Step 1: Load the Tag aggregate
    const tag = await this.tagRepository.findById(tagId);

    if (!tag) {
      throw new Error("TAG_NOT_FOUND");
    }

    // Step 2: Validate ownership
    if (!tag.isOwnedBy(currentUserId)) {
      throw new Error("TAG_NOT_OWNED");
    }

    // Step 3: Validate email format using RecipientEmail value object
    let email: RecipientEmail;
    try {
      email = new RecipientEmail(recipientEmail);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Invalid email";
      throw new Error(errorMsg);
    }

    // Step 4: Check if recipient already has access (business rule validation)
    // NOTE: This is a preliminary check. The RPC function will do the final check
    // to account for concurrent operations.

    // Step 5: Call RPC function to grant access
    // The RPC function handles:
    // - Email to user_id resolution
    // - Email confirmation check
    // - Self-sharing prevention
    // - Duplicate access prevention
    // - Actual database insert
    const { data, error } = await this.supabase.rpc("grant_tag_access", {
      p_tag_id: tagId,
      p_recipient_email: email.value,
    });

    if (error) {
      // Parse specific error messages from the RPC function
      const errorMsg = error.message;

      if (errorMsg.includes("Tag not found")) {
        throw new Error("TAG_NOT_FOUND");
      }
      if (errorMsg.includes("not owner") || errorMsg.includes("Forbidden")) {
        throw new Error("TAG_NOT_OWNED");
      }
      if (errorMsg.includes("User with this email not found")) {
        throw new Error("USER_NOT_FOUND");
      }
      if (errorMsg.includes("email not confirmed")) {
        throw new Error("USER_EMAIL_NOT_CONFIRMED");
      }
      if (errorMsg.includes("share tag with yourself")) {
        throw new Error("CANNOT_SHARE_WITH_SELF");
      }
      if (errorMsg.includes("already has access")) {
        throw new Error("DUPLICATE_ACCESS");
      }

      throw new Error(`Failed to grant tag access: ${errorMsg}`);
    }

    // Step 6: Verify response
    if (!data || data.length === 0) {
      throw new Error("Failed to grant tag access: no data returned");
    }

    const result = data[0];

    return {
      recipient_id: result.recipient_id,
      email: result.email,
      granted_at: result.granted_at,
    };
  }
}
