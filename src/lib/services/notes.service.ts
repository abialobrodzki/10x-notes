import { calculateOffset, createPaginationDTO } from "../utils/pagination.utils";
import type { Database } from "../../db/database.types";
import type { NotesListDTO, NoteListItemDTO, TagEmbeddedDTO, NoteEntity, TagEntity } from "../../types";
import type { NotesListQueryInput } from "../validators/notes.schemas";
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
}
