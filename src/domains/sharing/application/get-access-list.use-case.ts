import type { Database } from "../../../db/database.types";
import type { ITagRepository } from "../model/tag.repository";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * GetAccessListUseCase
 *
 * Application Service for retrieving the list of users with access to a tag.
 *
 * This use case:
 * 1. Loads the Tag aggregate
 * 2. Validates that the requester is the owner
 * 3. Returns the access list
 */
export class GetAccessListUseCase {
  constructor(
    private readonly tagRepository: ITagRepository,
    private readonly supabase: SupabaseClient<Database>
  ) {}

  /**
   * Execute the get access list use case
   *
   * @param tagId - ID of the tag to get access list for
   * @param currentUserId - ID of the user requesting the access list (must be tag owner)
   * @returns Array of recipients with access to the tag
   * @throws Error if business rules are violated or database operation fails
   */
  async execute(
    tagId: string,
    currentUserId: string
  ): Promise<{ recipient_id: string; email: string; granted_at: string }[]> {
    // Step 1: Load the Tag aggregate
    const tag = await this.tagRepository.findById(tagId);

    if (!tag) {
      throw new Error("TAG_NOT_FOUND");
    }

    // Step 2: Validate ownership
    if (!tag.isOwnedBy(currentUserId)) {
      throw new Error("TAG_NOT_OWNED");
    }

    // Step 3: Call RPC function to get access list
    // The RPC function handles:
    // - Ownership verification
    // - Fetching recipients with emails from auth.users (SECURITY DEFINER)
    const { data: recipients, error } = await this.supabase.rpc("get_tag_access_list", {
      p_tag_id: tagId,
    });

    if (error) {
      // Check for specific error messages from the RPC function
      if (error.message.includes("not found")) {
        throw new Error("TAG_NOT_FOUND");
      }
      if (error.message.includes("not owner") || error.message.includes("Forbidden")) {
        throw new Error("TAG_NOT_OWNED");
      }
      throw new Error(`Failed to fetch tag access list: ${error.message}`);
    }

    // Step 4: Transform and return results
    const recipientList = (recipients || []).map(
      (recipient: { recipient_id: string; email: string; granted_at: string }) => ({
        recipient_id: recipient.recipient_id,
        email: recipient.email,
        granted_at: recipient.granted_at,
      })
    );

    return recipientList;
  }
}
