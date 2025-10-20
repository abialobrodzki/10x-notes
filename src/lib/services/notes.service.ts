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
 * Raw note data from database with joined tag
 * Excludes original_content and suggested_tag (not needed for list view)
 */
interface NoteWithTag extends Omit<NoteEntity, "tag_id" | "original_content" | "suggested_tag"> {
  tags: Pick<TagEntity, "id" | "name">;
}

/**
 * Notes Service
 * Handles business logic for notes listing, filtering, and pagination
 */
export class NotesService {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  /**
   * Get paginated list of user's notes with filtering and sorting
   *
   * @param userId - Current user ID (from JWT)
   * @param query - Validated query parameters
   * @returns Paginated notes list with metadata
   * @throws Error if database query fails
   */
  async getNotes(userId: string, query: NotesListQueryInput): Promise<NotesListDTO> {
    // Step 1: Build and execute query for own notes
    const ownNotesQuery = this.buildNotesQuery(userId, query, false);
    const { data: ownNotes, error: ownNotesError } = await ownNotesQuery;

    if (ownNotesError) {
      throw new Error(`Failed to fetch own notes: ${ownNotesError.message}`);
    }

    let allNotes = ownNotes || [];

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

      const sharedTagIds = sharedTagsData?.map((t) => t.tag_id) || [];

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
        allNotes = [...allNotes, ...(sharedNotes || [])];

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

    // Step 6: Get note IDs for public link check
    const noteIds = paginatedNotes.map((note) => note.id);

    // Step 7: Fetch public links in batch
    const publicLinksMap = await this.getPublicLinksMap(noteIds);

    // Step 8: Transform to DTOs
    const noteListItems: NoteListItemDTO[] = paginatedNotes.map((note) =>
      this.transformToListItemDTO(note, userId, publicLinksMap)
    );

    // Step 9: Build response with pagination metadata
    return {
      notes: noteListItems,
      pagination: createPaginationDTO(query.page, query.limit, total),
    };
  }

  /**
   * Build Supabase query for notes
   *
   * @param userId - Current user ID
   * @param query - Query parameters
   * @param isShared - Whether to query for shared notes or own notes
   * @returns Supabase query builder
   */
  private buildNotesQuery(userId: string, query: NotesListQueryInput, isShared: boolean) {
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

    // Filter: own notes vs shared notes
    if (isShared) {
      // Shared notes: notes where tag is shared with user via tag_access
      // For shared notes, we need to query notes where the tag is in user's shared tags
      // This is a workaround - in production, use a database view or RPC function

      // This will be handled separately in getNotes() by fetching shared tag IDs first
      // For now, return early with empty query (will be replaced by actual implementation)
      // The actual filtering will happen in the parent method
      notesQuery = notesQuery.eq("user_id", "00000000-0000-0000-0000-000000000000"); // No-op query
    } else {
      // Own notes: notes created by user
      notesQuery = notesQuery.eq("user_id", userId);
    }

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
   * Sort notes array by specified field and order
   *
   * @param notes - Array of notes to sort
   * @param sortBy - Field to sort by
   * @param order - Sort order (asc/desc)
   * @returns Sorted array
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
        comparison = a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
        // Always descending for ID to ensure newest first for same dates
        comparison = -comparison;
      }

      // Apply order
      return order === "asc" ? comparison : -comparison;
    });
  }

  /**
   * Fetch public links for given note IDs
   * Returns a Map of note_id -> has_public_link
   *
   * @param noteIds - Array of note IDs
   * @returns Map of note_id to boolean (has active public link)
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
   * Transform raw note data to NoteListItemDTO
   *
   * @param note - Raw note with joined tag
   * @param currentUserId - Current user ID (to determine is_owner)
   * @param publicLinksMap - Map of note_id to has_public_link
   * @returns Formatted DTO
   */
  private transformToListItemDTO(
    note: NoteWithTag,
    currentUserId: string,
    publicLinksMap: Map<string, boolean>
  ): NoteListItemDTO {
    const tag: TagEmbeddedDTO = {
      id: note.tags.id,
      name: note.tags.name,
    };

    return {
      id: note.id,
      summary_text: note.summary_text,
      goal_status: note.goal_status,
      meeting_date: note.meeting_date,
      is_ai_generated: note.is_ai_generated,
      created_at: note.created_at,
      updated_at: note.updated_at,
      tag,
      is_owner: note.user_id === currentUserId,
      has_public_link: publicLinksMap.get(note.id) ?? false,
    };
  }

  /**
   * Create a new note with tag assignment
   *
   * Handles XOR logic: either tag_id (existing tag) or tag_name (find or create)
   * Auto-sets is_ai_generated = false when summary_text is null
   *
   * @param userId - Current user ID (from JWT)
   * @param input - Validated note creation data
   * @returns Created note with tag information
   * @throws Error if tag ownership verification fails or database operation fails
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
   * Find existing tag by name (case-insensitive) or create new tag
   *
   * Handles race conditions: if tag creation fails due to unique constraint,
   * retries SELECT (another request created it simultaneously)
   *
   * @param userId - Current user ID
   * @param tagName - Tag name to find or create
   * @returns Resolved tag ID
   * @throws Error if tag creation fails or race condition retry fails
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

      throw new Error(`Tag creation race condition retry failed: ${retryError?.message ?? "Unknown error"}`);
    }

    // Other insertion error
    throw new Error(`Failed to create tag: ${insertError?.message ?? "Unknown error"}`);
  }

  /**
   * Transform raw note data with joined tag to NoteDTO
   *
   * @param note - Raw note data from database with joined tag
   * @returns Formatted NoteDTO
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
   * Get note by ID with full details
   *
   * Access control: returns note if user is owner OR has shared access via tag_access
   * Returns null if note not found or user has no access (for 404 response)
   *
   * @param userId - Current user ID (from JWT)
   * @param noteId - Note ID to fetch
   * @returns Full note details with ownership and public link info, or null if no access
   * @throws Error if database query fails
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

    // Step 3: If owner, fetch public link (if exists)
    let publicLink: PublicLinkEmbeddedDTO | null = null;

    if (isOwner) {
      const { data: linkData, error: linkError } = await this.supabase
        .from("public_links")
        .select("token, is_enabled")
        .eq("note_id", noteId)
        .single();

      if (!linkError && linkData) {
        publicLink = {
          token: linkData.token,
          is_enabled: linkData.is_enabled,
          url: `/public/${linkData.token}`,
        };
      }
    }

    // Step 4: Transform to NoteDetailDTO
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
      is_owner: isOwner,
      public_link: publicLink,
    };
  }

  /**
   * Update note by ID (partial update)
   *
   * Only owner can update. Validates tag ownership if tag_id is being changed.
   * Updates only provided fields and sets updated_at to current timestamp.
   *
   * @param userId - Current user ID (from JWT)
   * @param noteId - Note ID to update
   * @param patch - Fields to update (at least one required)
   * @returns Updated note with tag information
   * @throws Error if note not found, user not owner, or tag not owned by user
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
    const { data: updatedNote, error: updateError } = await this.supabase
      .from("notes")
      .update({
        ...patch,
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
}
