import type { Database } from "../../../db/database.types";
import type { ITagRepository } from "../model/tag.repository";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * RevokeAccessUseCase
 *
 * Application Service for revoking access to a tag from a user.
 *
 * This use case:
 * 1. Loads the Tag aggregate
 * 2. Validates business rules (ownership)
 * 3. Calls RPC function to persist the change
 * 4. Completes the operation
 */
export class RevokeAccessUseCase {
  constructor(
    private readonly tagRepository: ITagRepository,
    private readonly supabase: SupabaseClient<Database>
  ) {}

  /**
   * Execute the revoke access use case
   *
   * @param tagId - ID of the tag to revoke access from
   * @param recipientId - ID of the recipient whose access should be revoked
   * @param currentUserId - ID of the user performing the operation (must be tag owner)
   * @throws Error if business rules are violated or database operation fails
   */
  async execute(tagId: string, recipientId: string, currentUserId: string): Promise<void> {
    // Step 1: Load the Tag aggregate
    const tag = await this.tagRepository.findById(tagId);

    if (!tag) {
      throw new Error("TAG_NOT_FOUND");
    }

    // Step 2: Validate ownership
    if (!tag.isOwnedBy(currentUserId)) {
      throw new Error("TAG_NOT_OWNED");
    }

    // Step 3: Call RPC function to revoke access
    // The RPC function handles:
    // - Ownership verification
    // - Actual database delete
    const { data, error } = await this.supabase.rpc("revoke_tag_access", {
      p_tag_id: tagId,
      p_recipient_id: recipientId,
    });

    if (error) {
      throw new Error(`Failed to revoke tag access: ${error.message}`);
    }

    // Step 4: Check if RPC returned error in response
    if (!data || typeof data !== "object") {
      throw new Error("Failed to revoke tag access: invalid response from server");
    }

    const result = data as { success: boolean; error?: string; deleted_count?: number };

    if (!result.success) {
      const errorMsg = result.error || "Unknown error";

      // Parse specific error messages from the RPC function
      if (errorMsg.includes("Tag not found")) {
        throw new Error("TAG_NOT_FOUND");
      }
      if (errorMsg.includes("not owner") || errorMsg.includes("Forbidden")) {
        throw new Error("TAG_NOT_OWNED");
      }
      if (errorMsg.includes("Unauthorized")) {
        throw new Error("UNAUTHORIZED");
      }

      throw new Error(`Failed to revoke tag access: ${errorMsg}`);
    }

    // Success - RPC executed and deleted the record
  }
}
