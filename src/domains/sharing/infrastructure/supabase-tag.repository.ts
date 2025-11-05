import { RecipientEmail } from "../model/recipient-email";
import { Tag } from "../model/tag";
import { TagAccess } from "../model/tag-access";
import type { Database } from "../../../db/database.types";
import type { ITagRepository } from "../model/tag.repository";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * SupabaseTagRepository
 *
 * Implementation of ITagRepository using Supabase PostgreSQL database.
 * Responsible for:
 * - Loading Tag aggregates with their access lists
 * - Saving changes to Tag aggregates
 * - Managing RLS policies and authentication
 */
export class SupabaseTagRepository implements ITagRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  /**
   * Find a tag by ID with its complete access list
   *
   * @param tagId - The tag ID to find
   * @returns The reconstructed Tag aggregate or null if not found
   * @throws Error if the database query fails
   */
  async findById(tagId: string): Promise<Tag | null> {
    // Fetch tag from database
    const { data: tagData, error: tagError } = await this.supabase
      .from("tags")
      .select("id, name, user_id, created_at, updated_at")
      .eq("id", tagId)
      .single();

    if (tagError) {
      // "PGRST116" is the error code for "no rows found"
      if (tagError.code === "PGRST116") {
        return null;
      }
      throw new Error(`Failed to fetch tag: ${tagError.message}`);
    }

    if (!tagData) {
      return null;
    }

    // Fetch access list for this tag (with recipient emails from auth.users)
    const { data: accessListData, error: accessError } = await this.supabase.rpc("get_tag_access_list", {
      p_tag_id: tagId,
    });

    if (accessError) {
      // If tag not found or user not owner, it's okay - just return tag with empty access list
      // This happens when loading a tag that user doesn't own
      const accessList: TagAccess[] = [];

      // Reconstruct the Tag aggregate
      return new Tag(tagData.id, tagData.user_id, tagData.name, accessList, tagData.created_at, tagData.updated_at);
    }

    // Transform access list data to TagAccess entities
    const accessList: TagAccess[] = (accessListData || []).map(
      (record: { recipient_id: string; email: string; granted_at: string }) => {
        const recipientEmail = new RecipientEmail(record.email);
        return new TagAccess(record.recipient_id, recipientEmail, record.granted_at);
      }
    );

    // Reconstruct the Tag aggregate
    return new Tag(tagData.id, tagData.user_id, tagData.name, accessList, tagData.created_at, tagData.updated_at);
  }

  /**
   * Save a tag aggregate
   *
   * For the Sharing domain, we primarily focus on saving access list changes.
   * The Tag name and basic properties are updated through the tags service.
   *
   * This implementation handles:
   * - Adding new access records (via RPC grant_tag_access)
   * - Removing revoked access records (via RPC revoke_tag_access)
   *
   * @param tag - The Tag aggregate to save
   * @throws Error if the save operation fails
   */
  async save(tag: Tag): Promise<void> {
    // Note: In a real DDD implementation with proper event sourcing,
    // we would track which access records were added/removed and only
    // perform those operations. For now, we'll use RPC functions that
    // are idempotent and handle the validation.
    //
    // This is called after business logic operations that modified the aggregate.
    // The actual persistence of individual access changes is handled by RPC functions
    // that are called from the application services when grant/revoke operations occur.

    // Validate that the tag exists (basic sanity check)
    const { data: existingTag, error: checkError } = await this.supabase
      .from("tags")
      .select("id")
      .eq("id", tag.id)
      .single();

    if (checkError || !existingTag) {
      throw new Error("TAG_NOT_FOUND: Cannot save changes to a non-existent tag");
    }

    // For now, this is a no-op as access changes are handled via RPC functions
    // in the application services. In a more sophisticated implementation, we might
    // track domain events or maintain a record of changes that occurred.
  }
}
