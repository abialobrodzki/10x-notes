/**
 * @module NotesService
 * @description This module provides the business logic for managing user notes,
 * including listing, filtering, pagination, creation, retrieval, updating, and deletion.
 * It handles interactions with the Supabase database for note and tag data.
 */

import { calculateOffset, createPaginationDTO } from "../utils/pagination.utils";
import type { Database } from "../../db/database.types";
import type {
  NotesListDTO,
  NoteListItemDTO,
  TagEmbeddedDTO,
  NoteEntity,
  TagEntity,
  NoteDTO,
  NoteDetailDTO,
  PublicLinkEmbeddedDTO,
} from "../../types";
import type { NotesListQueryInput, CreateNoteInput, UpdateNoteInput } from "../validators/notes.schemas";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * @interface NoteWithTag
 * @description Raw note data from the database with an embedded tag.
 * Excludes `original_content` and `suggested_tag` as they are not typically needed for list views.
 * @extends Omit<NoteEntity, "tag_id" | "original_content" | "suggested_tag">
 * @property {Pick<TagEntity, "id" | "name">} tags - The associated tag's ID and name.
 */
interface NoteWithTag extends Omit<NoteEntity, "tag_id" | "original_content" | "suggested_tag"> {
  tags: Pick<TagEntity, "id" | "name">;
}

/**
 * @class NotesService
 * @description Handles all business logic related to notes, including data retrieval,
 * manipulation, and interaction with the Supabase client. It manages note listing,
 * filtering, pagination, and CRUD operations, as well as handling shared notes and public links.
 */
export class NotesService {
  /**
   * @private
   * @readonly
   * @property {SupabaseClient<Database>} supabase - The Supabase client instance for database interactions.
   */
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  /**
   * Retrieves a paginated list of a user's notes, with options for filtering and sorting.
   * This method also supports including notes from tags that have been shared with the user.
   *
   * @param {string} userId - The ID of the current user (obtained from JWT).
   * @param {NotesListQueryInput} query - Validated query parameters for filtering, sorting, and pagination.
   * @returns {Promise<NotesListDTO>} A promise that resolves to a paginated list of notes with metadata.
   * @throws {Error} If any database query fails during the process of fetching notes or shared tags.
   */
  async getNotes(userId: string, query: NotesListQueryInput): Promise<NotesListDTO> {
    // Step 1: Build and execute query for own notes
    const ownNotesQuery = this.buildNotesQuery(userId, query);
    const { data: ownNotes, error: ownNotesError } = await ownNotesQuery;

    if (ownNotesError) {
      throw new Error(`Failed to fetch own notes: ${ownNotesError.message}`);
    }

    let allNotes = ownNotes as NoteWithTag[];

    // Step 2: If include_shared, fetch notes from shared tags
    if (query.include_shared) {
      // First, get tag IDs that are shared with this user
      const { data: sharedTagsData, error: sharedTagsError } = await this.supabase
        .from("tag_access")
        .select("tag_id")
        .eq("recipient_id", userId);

      if (sharedTagsError) {
        throw new Error(`Failed to fetch shared tags: ${sharedTagsError.message}`);
      }

      const sharedTagIds = sharedTagsData.map((t) => t.tag_id);

      // If user has shared tags, fetch notes with those tag_ids
      if (sharedTagIds.length > 0) {
        let sharedNotesQuery = this.supabase
          .from("notes")
          .select(
            `
            id,
            summary_text,
            goal_status,
            meeting_date,
            is_ai_generated,
            created_at,
            updated_at,
            user_id,
            tags!inner (
              id,
              name
            )
          `
          )
          .in("tag_id", sharedTagIds);

        // Apply same filters as for own notes
        if (query.tag_id) {
          sharedNotesQuery = sharedNotesQuery.eq("tag_id", query.tag_id);
        }
        if (query.goal_status) {
          sharedNotesQuery = sharedNotesQuery.eq("goal_status", query.goal_status);
        }
        if (query.date_from) {
          sharedNotesQuery = sharedNotesQuery.gte("meeting_date", query.date_from);
        }
        if (query.date_to) {
          sharedNotesQuery = sharedNotesQuery.lte("meeting_date", query.date_to);
        }

        const { data: sharedNotes, error: sharedNotesError } = await sharedNotesQuery;

        if (sharedNotesError) {
          throw new Error(`Failed to fetch shared notes: ${sharedNotesError.message}`);
        }

        // Merge own notes and shared notes
        allNotes = [...allNotes, ...sharedNotes];

        // Remove duplicates (in case user owns a tag that was also shared with them)
        const uniqueNotesMap = new Map<string, NoteWithTag>();
        allNotes.forEach((note) => uniqueNotesMap.set(note.id, note));
        allNotes = Array.from(uniqueNotesMap.values());
      }
    }

    // Step 3: Sort notes (in-memory, as we may have merged results)
    allNotes = this.sortNotes(allNotes, query.sort_by, query.order);

    // Step 4: Count total for pagination
    const total = allNotes.length;

    // Step 5: Apply pagination (slice array)
    const offset = calculateOffset(query.page, query.limit);
    const paginatedNotes = allNotes.slice(offset, offset + query.limit);

    // Step 6: Get note IDs for batch fetching
    const noteIds = paginatedNotes.map((note) => note.id);

    // Step 7: Fetch public links in batch
    const publicLinksMap = await this.getPublicLinksMap(noteIds);

    // Step 8: Fetch shared recipients counts for tags (only for owned tags)
    const ownedTagIds = paginatedNotes.filter((note) => note.user_id === userId).map((note) => note.tags.id);
    const sharedRecipientsMap = await this.getSharedRecipientsMap(ownedTagIds);

    // Step 9: Transform to DTOs
    const noteListItems: NoteListItemDTO[] = paginatedNotes.map((note) =>
      this.transformToListItemDTO(note, userId, publicLinksMap, sharedRecipientsMap)
    );

    // Step 10: Build response with pagination metadata
    return {
      notes: noteListItems,
      pagination: createPaginationDTO(query.page, query.limit, total),
    };
  }

  /**
   * Builds a Supabase query for fetching notes based on provided filters.
   * This is primarily used for querying a user's own notes.
   *
   * @private
   * @param userId - The ID of the current user.
   * @param query - The query parameters including filters.
   * @returns A Supabase query builder instance configured with the specified filters.
   */
  private buildNotesQuery(userId: string, query: NotesListQueryInput) {
    let notesQuery = this.supabase.from("notes").select(
      `
        id,
        summary_text,
        goal_status,
        meeting_date,
        is_ai_generated,
        created_at,
        updated_at,
        user_id,
        tags!inner (
          id,
          name
        )
      `,
      { count: "exact" }
    );

    // Filter: own notes only (shared notes are fetched separately in getNotes())
    notesQuery = notesQuery.eq("user_id", userId);

    // Filter: tag_id
    if (query.tag_id) {
      notesQuery = notesQuery.eq("tag_id", query.tag_id);
    }

    // Filter: goal_status
    if (query.goal_status) {
      notesQuery = notesQuery.eq("goal_status", query.goal_status);
    }

    // Filter: date range
    if (query.date_from) {
      notesQuery = notesQuery.gte("meeting_date", query.date_from);
    }
    if (query.date_to) {
      notesQuery = notesQuery.lte("meeting_date", query.date_to);
    }

    // Note: We'll sort and paginate in-memory after merging results
    // This is because we need to merge own and shared notes first

    return notesQuery;
  }

  /**
   * Sorts an array of notes based on a specified field and order.
   * Includes a secondary sort by ID for stable pagination when primary sort values are equal.
   *
   * @private
   * @param {NoteWithTag[]} notes - The array of notes to sort.
   * @param {"meeting_date" | "created_at" | "updated_at"} sortBy - The field to sort by.
   * @param {"asc" | "desc"} order - The sort order ('asc' for ascending, 'desc' for descending).
   * @returns {NoteWithTag[]} The sorted array of notes.
   */
  private sortNotes(
    notes: NoteWithTag[],
    sortBy: "meeting_date" | "created_at" | "updated_at",
    order: "asc" | "desc"
  ): NoteWithTag[] {
    return notes.sort((a, b) => {
      // Primary sort by specified field
      const aValue = a[sortBy];
      const bValue = b[sortBy];

      let comparison = 0;
      if (aValue < bValue) comparison = -1;
      if (aValue > bValue) comparison = 1;

      // Secondary sort by id (for stable pagination)
      if (comparison === 0) {
        comparison = a.id < b.id ? -1 : 1; // IDs are unique, so never equal
        // Always descending for ID to ensure newest first for same dates
        comparison = -comparison;
      }

      // Apply order
      return order === "asc" ? comparison : -comparison;
    });
  }

  /**
   * Fetches public link information for a given set of note IDs.
   * Returns a Map indicating whether each note has an active public link.
   * Errors during fetching are logged but do not prevent the service from returning an empty map.
   *
   * @private
   * @param {string[]} noteIds - An array of note IDs for which to fetch public links.
   * @returns {Promise<Map<string, boolean>>} A promise that resolves to a Map where keys are `note_id`s
   * and values are booleans indicating if an active public link exists.
   */
  private async getPublicLinksMap(noteIds: string[]): Promise<Map<string, boolean>> {
    if (noteIds.length === 0) {
      return new Map();
    }

    const { data: publicLinks, error } = await this.supabase
      .from("public_links")
      .select("note_id, is_enabled")
      .in("note_id", noteIds);

    if (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to fetch public links:", error);
      // Don't throw - return empty map, all notes will have has_public_link: false
      return new Map();
    }

    // Build map: note_id -> has active public link
    const map = new Map<string, boolean>();
    publicLinks?.forEach((link) => {
      map.set(link.note_id, link.is_enabled);
    });

    return map;
  }

  /**
   * Retrieves the count of shared recipients for a given set of tag IDs.
   * This method utilizes a Supabase RPC function (`get_tags_shared_counts`)
   * which handles ownership verification and aggregation.
   * Errors during fetching are logged but do not prevent the service from returning an empty map.
   *
   * @private
   * @param {string[]} tagIds - An array of tag IDs (expected to be owned by the current user).
   * @returns {Promise<Map<string, number>>} A promise that resolves to a Map where keys are `tag_id`s
   * and values are the number of shared recipients for that tag.
   */
  private async getSharedRecipientsMap(tagIds: string[]): Promise<Map<string, number>> {
    if (tagIds.length === 0) {
      return new Map();
    }

    // Call RPC function that handles ownership check and aggregation
    // Function signature: get_tags_shared_counts(p_tag_ids uuid[]) -> TABLE(tag_id uuid, recipients_count bigint)
    const { data: counts, error } = await this.supabase.rpc("get_tags_shared_counts", {
      p_tag_ids: tagIds,
    });

    if (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to fetch shared recipients counts:", error);
      // Don't throw - return empty map, all tags will have shared_recipients: 0
      return new Map();
    }

    // Transform array to Map
    const countsMap = new Map<string, number>();
    counts?.forEach((row: { tag_id: string; recipients_count: number }) => {
      countsMap.set(row.tag_id, row.recipients_count);
    });

    return countsMap;
  }

  /**
   * Transforms raw note data (with joined tag) into a `NoteListItemDTO`.
   * This DTO is suitable for displaying notes in a list view, including ownership
   * and public link status.
   *
   * @private
   * @param {NoteWithTag} note - The raw note data from the database.
   * @param {string} currentUserId - The ID of the current authenticated user.
   * @param {Map<string, boolean>} publicLinksMap - A map of note IDs to their public link status.
   * @param {Map<string, number>} sharedRecipientsMap - A map of tag IDs to their shared recipients count.
   * @returns {NoteListItemDTO} The formatted note list item DTO.
   */
  private transformToListItemDTO(
    note: NoteWithTag,
    currentUserId: string,
    publicLinksMap: Map<string, boolean>,
    sharedRecipientsMap: Map<string, number>
  ): NoteListItemDTO {
    const isOwner = note.user_id === currentUserId;

    const tag: TagEmbeddedDTO & { shared_recipients?: number } = {
      id: note.tags.id,
      name: note.tags.name,
    };

    // Only include shared_recipients for owned notes
    if (isOwner) {
      const sharedCount = sharedRecipientsMap.get(note.tags.id);
      if (sharedCount !== undefined) {
        tag.shared_recipients = sharedCount;
      }
    }

    return {
      id: note.id,
      summary_text: note.summary_text,
      goal_status: note.goal_status,
      meeting_date: note.meeting_date,
      is_ai_generated: note.is_ai_generated,
      created_at: note.created_at,
      updated_at: note.updated_at,
      tag,
      is_owner: isOwner,
      has_public_link: publicLinksMap.get(note.id) ?? false,
    };
  }

  /**
   * Creates a new note with tag assignment.
   * This method handles the logic for associating a note with an existing tag
   * or creating a new tag if specified by name. It also auto-sets `is_ai_generated`
   * based on the presence of `summary_text`.
   *
   * @param {string} userId - The ID of the current user (from JWT).
   * @param {CreateNoteInput} input - Validated data for creating the note.
   * @param {string} [input.tag_id] - Optional: The ID of an existing tag to assign the note to.
   * @param {string} [input.tag_name] - Optional: The name of a new tag to create and assign, or an existing tag to find.
   * @param {string} input.original_content - The original content of the note.
   * @param {string} [input.summary_text] - Optional: The summarized text of the note.
   * @param {Database["public"]["Enums"]["goal_status_enum"]} [input.goal_status] - Optional: The goal status of the note.
   * @param {string} [input.suggested_tag] - Optional: A suggested tag name.
   * @param {string} [input.meeting_date] - Optional: The date of the meeting. Defaults to today's date.
   * @param {boolean} [input.is_ai_generated] - Optional: Indicates if the summary was AI-generated. Defaults to `true` if `summary_text` is present, `false` otherwise.
   * @returns {Promise<NoteDTO>} A promise that resolves to the created note with its tag information.
   * @throws {Error} If the tag ownership cannot be verified, if tag creation fails, or if the database insertion fails.
   */
  async createNote(userId: string, input: CreateNoteInput): Promise<NoteDTO> {
    // Step 1: Resolve tag_id (XOR logic: tag_id OR tag_name)
    let resolvedTagId: string;

    if (input.tag_id) {
      // Use existing tag - verify ownership
      const { data: tag, error: tagError } = await this.supabase
        .from("tags")
        .select("id")
        .eq("id", input.tag_id)
        .eq("user_id", userId)
        .single();

      if (tagError || !tag) {
        throw new Error("TAG_NOT_FOUND_OR_ACCESS_DENIED");
      }

      resolvedTagId = tag.id;
    } else if (input.tag_name) {
      // Find or create tag by name (case-insensitive)
      resolvedTagId = await this.findOrCreateTag(userId, input.tag_name);
    } else {
      // This should never happen due to Zod validation, but TypeScript doesn't know that
      throw new Error("Either tag_id or tag_name must be provided");
    }

    // Step 2: Auto-set is_ai_generated = false when summary_text is null/undefined
    const isAiGenerated = input.summary_text ? (input.is_ai_generated ?? true) : false;

    // Step 3: Prepare note data for insertion
    const noteData = {
      user_id: userId,
      tag_id: resolvedTagId,
      original_content: input.original_content,
      summary_text: input.summary_text ?? null,
      goal_status: input.goal_status ?? null,
      suggested_tag: input.suggested_tag ?? null,
      meeting_date: input.meeting_date ?? new Date().toISOString().split("T")[0], // Default to today
      is_ai_generated: isAiGenerated,
    };

    // Step 4: Insert note
    const { data: createdNote, error: insertError } = await this.supabase
      .from("notes")
      .insert(noteData)
      .select(
        `
        id,
        original_content,
        summary_text,
        goal_status,
        suggested_tag,
        meeting_date,
        is_ai_generated,
        created_at,
        updated_at,
        tags!inner (
          id,
          name
        )
      `
      )
      .single();

    if (insertError) {
      throw new Error(`Failed to create note: ${insertError.message}`);
    }

    if (!createdNote) {
      throw new Error("Note creation failed: no data returned");
    }

    // Step 5: Transform to NoteDTO
    return this.transformToNoteDTO(createdNote);
  }

  /**
   * Finds an existing tag by name (case-insensitive) for the given user, or creates a new one if it doesn't exist.
   * This method includes logic to handle race conditions during tag creation by retrying the SELECT operation
   * if a unique constraint violation occurs.
   *
   * @private
   * @param {string} userId - The ID of the current user.
   * @param {string} tagName - The name of the tag to find or create.
   * @returns {Promise<string>} A promise that resolves to the ID of the found or newly created tag.
   * @throws {Error} If searching for an existing tag fails, if tag creation fails for reasons other than a race condition,
   * or if the race condition retry for SELECT also fails.
   */
  private async findOrCreateTag(userId: string, tagName: string): Promise<string> {
    // Step 1: Try to find existing tag (case-insensitive)
    const { data: existingTag, error: selectError } = await this.supabase
      .from("tags")
      .select("id")
      .eq("user_id", userId)
      .ilike("name", tagName) // Case-insensitive match
      .single();

    if (existingTag) {
      return existingTag.id;
    }

    // If error is not "no rows found", throw it
    if (selectError && selectError.code !== "PGRST116") {
      throw new Error(`Failed to search for tag: ${selectError.message}`);
    }

    // Step 2: Tag not found, create new tag
    const { data: newTag, error: insertError } = await this.supabase
      .from("tags")
      .insert({ user_id: userId, name: tagName })
      .select("id")
      .single();

    if (newTag) {
      return newTag.id;
    }

    // Step 3: Handle race condition - unique constraint violation
    // Another request created the tag between SELECT and INSERT
    if (insertError && insertError.code === "23505") {
      // Unique constraint violation - retry SELECT
      const { data: retryTag, error: retryError } = await this.supabase
        .from("tags")
        .select("id")
        .eq("user_id", userId)
        .ilike("name", tagName)
        .single();

      if (retryTag) {
        return retryTag.id;
      }

      throw new Error(`Tag creation race condition retry failed: ${(retryError as { message: string }).message}`);
    }

    // Other insertion error
    throw new Error(`Failed to create tag: ${(insertError as { message: string }).message}`);
  }

  /**
   * Transforms raw note data (with joined tag) from the database into a `NoteDTO`.
   * This DTO represents the full details of a note suitable for display or further processing.
   *
   * @private
   * @param {object} note - The raw note data object from the database.
   * @param {string} note.id - The unique identifier of the note.
   * @param {string} note.original_content - The original content of the note.
   * @param {string | null} note.summary_text - The summarized text of the note, or `null`.
   * @param {Database["public"]["Enums"]["goal_status_enum"] | null} note.goal_status - The goal status of the note, or `null`.
   * @param {string | null} note.suggested_tag - A suggested tag name, or `null`.
   * @param {string} note.meeting_date - The date of the meeting.
   * @param {boolean} note.is_ai_generated - Indicates if the summary was AI-generated.
   * @param {string} note.created_at - The creation timestamp of the note.
   * @param {string} note.updated_at - The last update timestamp of the note.
   * @param {{ id: string; name: string }} note.tags - The embedded tag object with ID and name.
   * @returns {NoteDTO} The formatted note DTO.
   */
  private transformToNoteDTO(note: {
    id: string;
    original_content: string;
    summary_text: string | null;
    goal_status: Database["public"]["Enums"]["goal_status_enum"] | null;
    suggested_tag: string | null;
    meeting_date: string;
    is_ai_generated: boolean;
    created_at: string;
    updated_at: string;
    tags: { id: string; name: string };
  }): NoteDTO {
    const tag: TagEmbeddedDTO = {
      id: note.tags.id,
      name: note.tags.name,
    };

    return {
      id: note.id,
      original_content: note.original_content,
      summary_text: note.summary_text,
      goal_status: note.goal_status,
      suggested_tag: note.suggested_tag,
      meeting_date: note.meeting_date,
      is_ai_generated: note.is_ai_generated,
      created_at: note.created_at,
      updated_at: note.updated_at,
      tag,
    };
  }

  /**
   * Retrieves a single note by its ID with full details.
   * This method includes access control: a note is returned only if the user is its owner
   * or has shared access via `tag_access`. If the note is not found or the user has no access,
   * `null` is returned to prevent revealing its existence.
   *
   * @param {string} userId - The ID of the current user (from JWT).
   * @param {string} noteId - The ID of the note to fetch.
   * @returns {Promise<NoteDetailDTO | null>} A promise that resolves to the full note details
   * with ownership and public link information, or `null` if the note is not found or access is denied.
   * @throws {Error} If a database query fails unexpectedly.
   */
  async getNoteById(userId: string, noteId: string): Promise<NoteDetailDTO | null> {
    // Step 1: Query note with joined tag
    const { data: note, error: noteError } = await this.supabase
      .from("notes")
      .select(
        `
        id,
        original_content,
        summary_text,
        goal_status,
        suggested_tag,
        meeting_date,
        is_ai_generated,
        created_at,
        updated_at,
        user_id,
        tag_id,
        tags!inner (
          id,
          name
        )
      `
      )
      .eq("id", noteId)
      .single();

    if (noteError || !note) {
      // Note not found or database error - return null (will be 404)
      return null;
    }

    // Step 2: Check access permissions
    const isOwner = note.user_id === userId;
    let hasAccess = isOwner;

    if (!isOwner) {
      // Check if user has shared access via tag_access
      const { data: tagAccess, error: accessError } = await this.supabase
        .from("tag_access")
        .select("tag_id")
        .eq("tag_id", note.tag_id)
        .eq("recipient_id", userId)
        .single();

      if (!accessError && tagAccess) {
        hasAccess = true;
      }
    }

    // If user has no access, return null (will be 404 - don't reveal existence)
    if (!hasAccess) {
      return null;
    }

    // Step 3: If owner, fetch public link and shared recipients count
    let publicLink: PublicLinkEmbeddedDTO | null = null;
    let sharedRecipientsCount: number | undefined = undefined;

    if (isOwner) {
      // Fetch public link
      const { data: linkData } = await this.supabase
        .from("public_links")
        .select("token, is_enabled")
        .eq("note_id", noteId)
        .single();

      if (linkData) {
        publicLink = {
          token: linkData.token,
          is_enabled: linkData.is_enabled,
          url: `/share/${linkData.token}`,
        };
      }

      // Fetch shared recipients count for this tag
      const { data: tagAccessData } = await this.supabase
        .from("tag_access")
        .select("recipient_id")
        .eq("tag_id", note.tag_id);

      sharedRecipientsCount = tagAccessData?.length ?? 0;
    }

    // Step 4: Transform to NoteDetailDTO
    const tag: TagEmbeddedDTO & { shared_recipients?: number } = {
      id: note.tags.id,
      name: note.tags.name,
    };

    // Only include shared_recipients for owned notes
    if (isOwner && sharedRecipientsCount !== undefined) {
      tag.shared_recipients = sharedRecipientsCount;
    }

    return {
      id: note.id,
      original_content: note.original_content,
      summary_text: note.summary_text,
      goal_status: note.goal_status,
      suggested_tag: note.suggested_tag,
      meeting_date: note.meeting_date,
      is_ai_generated: note.is_ai_generated,
      created_at: note.created_at,
      updated_at: note.updated_at,
      tag,
      is_owner: isOwner,
      public_link: publicLink,
    };
  }

  /**
   * Updates an existing note identified by its ID.
   * Only the owner of the note can perform updates. This method supports partial updates,
   * meaning only the fields provided in the `patch` object will be updated.
   * If `tag_id` is changed, ownership of the new tag is also verified.
   *
   * @param {string} userId - The ID of the current user (from JWT).
   * @param {string} noteId - The ID of the note to update.
   * @param {UpdateNoteInput} patch - An object containing the fields to update. At least one field must be provided.
   * @returns {Promise<NoteDTO>} A promise that resolves to the updated note with its tag information.
   * @throws {Error} "NOTE_NOT_FOUND" if the note does not exist.
   * @throws {Error} "NOTE_NOT_OWNED" if the current user is not the owner of the note.
   * @throws {Error} "TAG_NOT_OWNED" if `tag_id` is updated to a tag not owned by the user.
   * @throws {Error} If the database update operation fails.
   */
  async updateNote(userId: string, noteId: string, patch: UpdateNoteInput): Promise<NoteDTO> {
    // Step 1: Verify note exists and user is owner
    const { data: existingNote, error: noteError } = await this.supabase
      .from("notes")
      .select("id, user_id")
      .eq("id", noteId)
      .single();

    if (noteError || !existingNote) {
      throw new Error("NOTE_NOT_FOUND");
    }

    if (existingNote.user_id !== userId) {
      throw new Error("NOTE_NOT_OWNED");
    }

    // Step 2: If tag_id is being updated, verify user owns the new tag
    if (patch.tag_id) {
      const { data: tag, error: tagError } = await this.supabase
        .from("tags")
        .select("id")
        .eq("id", patch.tag_id)
        .eq("user_id", userId)
        .single();

      if (tagError || !tag) {
        throw new Error("TAG_NOT_OWNED");
      }
    }

    // Step 3: Update note with provided fields
    // Filter out null values to avoid type conflicts with Supabase schema
    const updateData = Object.fromEntries(
      Object.entries(patch).filter(([, value]) => value !== null && value !== undefined)
    );

    const { data: updatedNote, error: updateError } = await this.supabase
      .from("notes")
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", noteId)
      .select(
        `
        id,
        original_content,
        summary_text,
        goal_status,
        suggested_tag,
        meeting_date,
        is_ai_generated,
        created_at,
        updated_at,
        tags!inner (
          id,
          name
        )
      `
      )
      .single();

    if (updateError) {
      throw new Error(`Failed to update note: ${updateError.message}`);
    }

    if (!updatedNote) {
      throw new Error("Note update failed: no data returned");
    }

    // Step 4: Transform to NoteDTO
    return this.transformToNoteDTO(updatedNote);
  }

  /**
   * Deletes a note identified by its ID.
   * Only the owner of the note can perform this operation. Related records (e.g., public links)
   * are automatically deleted via CASCADE rules configured in the database.
   *
   * @param {string} userId - The ID of the current user (from JWT).
   * @param {string} noteId - The ID of the note to delete.
   * @returns {Promise<void>} A promise that resolves when the note has been successfully deleted.
   * @throws {Error} "NOTE_NOT_FOUND" if the note does not exist.
   * @throws {Error} "NOTE_NOT_OWNED" if the current user is not the owner of the note.
   * @throws {Error} If the database deletion operation fails.
   */
  async deleteNote(userId: string, noteId: string): Promise<void> {
    // Step 1: Verify note exists and user is owner
    const { data: existingNote, error: noteError } = await this.supabase
      .from("notes")
      .select("id, user_id")
      .eq("id", noteId)
      .single();

    if (noteError || !existingNote) {
      throw new Error("NOTE_NOT_FOUND");
    }

    if (existingNote.user_id !== userId) {
      throw new Error("NOTE_NOT_OWNED");
    }

    // Step 2: Delete note (CASCADE will delete related records)
    const { error: deleteError } = await this.supabase.from("notes").delete().eq("id", noteId).eq("user_id", userId);

    if (deleteError) {
      throw new Error(`Failed to delete note: ${deleteError.message}`);
    }
  }
}
