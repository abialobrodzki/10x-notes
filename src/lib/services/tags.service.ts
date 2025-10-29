import type { Database } from "../../db/database.types";
import type { TagEntity, TagsListDTO, TagWithStatsDTO, TagDTO } from "../../types";
import type { TagsListQueryInput, CreateTagInput, UpdateTagInput } from "../validators/tags.schemas";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Tags Service
 * Handles business logic for tags listing with statistics
 */
export class TagsService {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  /**
   * Get list of user's tags with statistics
   *
   * Returns owned tags and optionally shared tags (via tag_access)
   * Each tag includes note_count and shared_recipients (only for owned tags)
   *
   * @param userId - Current user ID (from JWT)
   * @param query - Validated query parameters
   * @returns Tags list with statistics
   * @throws Error if database query fails
   */
  async getTags(userId: string, query: TagsListQueryInput): Promise<TagsListDTO> {
    // Step 1: Fetch owned tags
    const { data: ownedTags, error: ownedError } = await this.supabase
      .from("tags")
      .select("*")
      .eq("user_id", userId)
      .order("name", { ascending: true });

    if (ownedError) {
      throw new Error(`Failed to fetch owned tags: ${ownedError.message}`);
    }

    let allTags: TagEntity[] = ownedTags || [];
    const ownedTagIds = new Set(allTags.map((tag) => tag.id));

    // Step 2: If include_shared, fetch shared tags via notes (not direct tags query)
    // IMPORTANT: Recipients cannot query tags table directly (would cause circular dependency)
    // Instead, we get shared tags through notes they have access to
    if (query.include_shared) {
      // Get shared tags by querying notes the user has access to (via tag_access)
      const { data: notesWithSharedTags, error: notesError } = await this.supabase
        .from("notes")
        .select(
          `
          tags!inner (
            id,
            name,
            user_id,
            created_at,
            updated_at
          )
        `
        )
        .neq("user_id", userId); // Exclude own notes (we already have own tags)

      if (notesError) {
        throw new Error(`Failed to fetch shared tags: ${notesError.message}`);
      }

      // Extract unique shared tags from notes
      if (notesWithSharedTags && notesWithSharedTags.length > 0) {
        const sharedTagsMap = new Map<string, TagEntity>();
        notesWithSharedTags.forEach((note: { tags: TagEntity }) => {
          const tag = note.tags;
          if (tag && !ownedTagIds.has(tag.id)) {
            sharedTagsMap.set(tag.id, tag);
          }
        });

        const sharedTags = Array.from(sharedTagsMap.values());

        // Merge owned and shared tags
        allTags = [...allTags, ...sharedTags];
      }
    }

    // If no tags found, return empty list
    if (allTags.length === 0) {
      return { tags: [] };
    }

    // Step 3: Get note counts for all tags (batch query)
    const tagIds = allTags.map((tag) => tag.id);
    const noteCountsMap = await this.getNoteCountsMap(tagIds);

    // Step 4: Get shared recipients counts for owned tags only
    const sharedRecipientsMap = await this.getSharedRecipientsMap(Array.from(ownedTagIds));

    // Step 5: Transform to DTOs with statistics
    const tagsWithStats: TagWithStatsDTO[] = allTags.map((tag) =>
      this.transformToTagWithStatsDTO(tag, userId, ownedTagIds, noteCountsMap, sharedRecipientsMap)
    );

    return { tags: tagsWithStats };
  }

  /**
   * Get note counts for given tag IDs
   * Returns a Map of tag_id -> count
   *
   * @param tagIds - Array of tag IDs
   * @returns Map of tag_id to note count
   */
  private async getNoteCountsMap(tagIds: string[]): Promise<Map<string, number>> {
    if (tagIds.length === 0) {
      return new Map();
    }

    // Use RPC or raw SQL for efficient GROUP BY count
    // Since Supabase JS doesn't support GROUP BY well, we'll fetch all notes and count in-memory
    const { data: notes, error } = await this.supabase.from("notes").select("tag_id").in("tag_id", tagIds);

    if (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to fetch note counts:", error);
      // Don't throw - return empty map, all tags will have note_count: 0
      return new Map();
    }

    // Count notes per tag_id
    const countsMap = new Map<string, number>();
    notes?.forEach((note) => {
      const currentCount = countsMap.get(note.tag_id) || 0;
      countsMap.set(note.tag_id, currentCount + 1);
    });

    return countsMap;
  }

  /**
   * Get shared recipients counts for given tag IDs
   * Returns a Map of tag_id -> count of recipients
   *
   * @param tagIds - Array of tag IDs (should be owned tags only)
   * @returns Map of tag_id to shared recipients count
   */
  private async getSharedRecipientsMap(tagIds: string[]): Promise<Map<string, number>> {
    if (tagIds.length === 0) {
      return new Map();
    }

    const { data: tagAccess, error } = await this.supabase.from("tag_access").select("tag_id").in("tag_id", tagIds);

    if (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to fetch shared recipients counts:", error);
      // Don't throw - return empty map, all tags will have shared_recipients: 0
      return new Map();
    }

    // Count recipients per tag_id
    const countsMap = new Map<string, number>();
    tagAccess?.forEach((access) => {
      const currentCount = countsMap.get(access.tag_id) || 0;
      countsMap.set(access.tag_id, currentCount + 1);
    });

    return countsMap;
  }

  /**
   * Transform tag entity to TagWithStatsDTO
   *
   * @param tag - Raw tag entity
   * @param currentUserId - Current user ID
   * @param ownedTagIds - Set of owned tag IDs
   * @param noteCountsMap - Map of tag_id to note count
   * @param sharedRecipientsMap - Map of tag_id to shared recipients count
   * @returns Formatted TagWithStatsDTO
   */
  private transformToTagWithStatsDTO(
    tag: TagEntity,
    currentUserId: string,
    ownedTagIds: Set<string>,
    noteCountsMap: Map<string, number>,
    sharedRecipientsMap: Map<string, number>
  ): TagWithStatsDTO {
    const isOwner = ownedTagIds.has(tag.id);
    const noteCount = noteCountsMap.get(tag.id) ?? 0;

    const baseDTO: TagWithStatsDTO = {
      id: tag.id,
      name: tag.name,
      created_at: tag.created_at,
      updated_at: tag.updated_at,
      is_owner: isOwner,
      note_count: noteCount,
    };

    // Only include shared_recipients for owned tags
    if (isOwner) {
      baseDTO.shared_recipients = sharedRecipientsMap.get(tag.id) ?? 0;
    }

    return baseDTO;
  }

  /**
   * Create a new tag for user
   *
   * Validates uniqueness of tag name (case-insensitive) within user's tags
   * Automatically sets user_id to current user
   *
   * @param userId - Current user ID (from JWT)
   * @param input - Validated tag creation data
   * @returns Created tag (id, name, created_at, updated_at)
   * @throws Error if tag with this name already exists or database operation fails
   */
  async createTag(userId: string, input: CreateTagInput): Promise<TagDTO> {
    // Step 1: Check if tag with this name already exists for this user (case-insensitive)
    const { data: existingTag, error: checkError } = await this.supabase
      .from("tags")
      .select("id")
      .eq("user_id", userId)
      .ilike("name", input.name)
      .single();

    // If tag exists, throw error for 409 Conflict
    if (existingTag) {
      throw new Error("TAG_NAME_ALREADY_EXISTS");
    }

    // If error is not "no rows found", throw it
    if (checkError && checkError.code !== "PGRST116") {
      throw new Error(`Failed to check tag uniqueness: ${checkError.message}`);
    }

    // Step 2: Insert new tag
    const { data: newTag, error: insertError } = await this.supabase
      .from("tags")
      .insert({
        user_id: userId,
        name: input.name,
      })
      .select("id, name, created_at, updated_at")
      .single();

    if (insertError) {
      // Handle unique constraint violation from database (in case of race condition)
      if (insertError.code === "23505") {
        throw new Error("TAG_NAME_ALREADY_EXISTS");
      }
      throw new Error(`Failed to create tag: ${insertError.message}`);
    }

    if (!newTag) {
      throw new Error("Tag creation failed: no data returned");
    }

    // Step 3: Return TagDTO (excludes user_id)
    return {
      id: newTag.id,
      name: newTag.name,
      created_at: newTag.created_at,
      updated_at: newTag.updated_at,
    };
  }

  /**
   * Update tag name (owner only)
   *
   * Validates ownership and uniqueness of new name (case-insensitive)
   * Automatically sets updated_at to current timestamp
   *
   * @param userId - Current user ID (from JWT)
   * @param tagId - Tag ID to update
   * @param input - Validated tag update data
   * @returns Updated tag (id, name, created_at, updated_at)
   * @throws Error if tag not found, user not owner, or name already exists
   */
  async updateTag(userId: string, tagId: string, input: UpdateTagInput): Promise<TagDTO> {
    // Step 1: Check if tag exists and user is owner
    const { data: existingTag, error: checkError } = await this.supabase
      .from("tags")
      .select("id, name, user_id")
      .eq("id", tagId)
      .single();

    if (checkError || !existingTag) {
      throw new Error("TAG_NOT_FOUND");
    }

    if (existingTag.user_id !== userId) {
      throw new Error("TAG_NOT_OWNED");
    }

    // Step 2: Check if new name is different (optimization: skip uniqueness check if same)
    const isSameName = existingTag.name.toLowerCase() === input.name.toLowerCase();

    if (!isSameName) {
      // Step 3: Check if new name is unique within user's tags
      const { data: duplicateTag, error: duplicateError } = await this.supabase
        .from("tags")
        .select("id")
        .eq("user_id", userId)
        .ilike("name", input.name)
        .neq("id", tagId) // Exclude current tag from check
        .single();

      if (duplicateTag) {
        throw new Error("TAG_NAME_ALREADY_EXISTS");
      }

      // If error is not "no rows found", throw it
      if (duplicateError && duplicateError.code !== "PGRST116") {
        throw new Error(`Failed to check tag uniqueness: ${duplicateError.message}`);
      }
    }

    // Step 4: Update tag name and updated_at
    const { data: updatedTag, error: updateError } = await this.supabase
      .from("tags")
      .update({
        name: input.name,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tagId)
      .select("id, name, created_at, updated_at")
      .single();

    if (updateError) {
      // Handle unique constraint violation from database (in case of race condition)
      if (updateError.code === "23505") {
        throw new Error("TAG_NAME_ALREADY_EXISTS");
      }
      throw new Error(`Failed to update tag: ${updateError.message}`);
    }

    if (!updatedTag) {
      throw new Error("Tag update failed: no data returned");
    }

    // Step 5: Return TagDTO (excludes user_id)
    return {
      id: updatedTag.id,
      name: updatedTag.name,
      created_at: updatedTag.created_at,
      updated_at: updatedTag.updated_at,
    };
  }

  /**
   * Delete tag by ID (owner only)
   *
   * Tag cannot be deleted if it has assigned notes (FK RESTRICT).
   * Cascades deletion to tag_access records automatically.
   *
   * @param userId - Current user ID (from JWT)
   * @param tagId - Tag ID to delete
   * @throws Error if tag not found, user not owner, or tag has notes
   */
  async deleteTag(userId: string, tagId: string): Promise<void> {
    // Step 1: Check if tag exists and user is owner
    const { data: existingTag, error: checkError } = await this.supabase
      .from("tags")
      .select("id, user_id")
      .eq("id", tagId)
      .single();

    if (checkError || !existingTag) {
      throw new Error("TAG_NOT_FOUND");
    }

    if (existingTag.user_id !== userId) {
      throw new Error("TAG_NOT_OWNED");
    }

    // Step 2: Check if tag has assigned notes (cannot delete if notes exist)
    const { count: noteCount, error: countError } = await this.supabase
      .from("notes")
      .select("*", { count: "exact", head: true })
      .eq("tag_id", tagId);

    if (countError) {
      throw new Error(`Failed to check note count: ${countError.message}`);
    }

    if (noteCount && noteCount > 0) {
      throw new Error("TAG_HAS_NOTES");
    }

    // Step 3: Delete tag (CASCADE will delete tag_access records automatically)
    const { error: deleteError } = await this.supabase.from("tags").delete().eq("id", tagId).eq("user_id", userId);

    if (deleteError) {
      throw new Error(`Failed to delete tag: ${deleteError.message}`);
    }
  }
}
