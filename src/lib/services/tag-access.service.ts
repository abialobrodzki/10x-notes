import type { Database } from "../../db/database.types";
import type { TagAccessListDTO, TagAccessRecipientDTO } from "../../types";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Tag Access Service
 * Handles business logic for tag access management
 */
export class TagAccessService {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  /**
   * Get list of users with access to a tag
   *
   * Returns list of recipients (users) who have access to the specified tag.
   * Only tag owner can view the access list.
   *
   * Uses RPC function get_tag_access_list() which:
   * - Verifies tag ownership
   * - Fetches recipients with emails from auth.users (SECURITY DEFINER)
   * - Returns only data for tags owned by current user
   *
   * @param userId - Current user ID (from JWT) - not used directly, auth.uid() is used in RPC
   * @param tagId - Tag ID to get access list for
   * @returns List of recipients with access to the tag
   * @throws Error if tag not found, user not owner, or database query fails
   */
  async getTagAccess(userId: string, tagId: string): Promise<TagAccessListDTO> {
    // Call RPC function that handles ownership check and fetches emails
    // Function signature: get_tag_access_list(p_tag_id uuid) -> TABLE(recipient_id uuid, email text, granted_at timestamptz)
    // The function uses auth.uid() internally to verify ownership
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

    // Transform to DTO format
    const recipientDTOs: TagAccessRecipientDTO[] = (recipients || []).map(
      (recipient: { recipient_id: string; email: string; granted_at: string }) => ({
        recipient_id: recipient.recipient_id,
        email: recipient.email,
        granted_at: recipient.granted_at,
      })
    );

    return { recipients: recipientDTOs };
  }
}
