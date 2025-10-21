import type { Database } from "./db/database.types";

// ============================================================================
// Base Entity Types (from Database)
// ============================================================================

/** Note entity from database */
export type NoteEntity = Database["public"]["Tables"]["notes"]["Row"];

/** Tag entity from database */
export type TagEntity = Database["public"]["Tables"]["tags"]["Row"];

/** Tag access entity from database */
export type TagAccessEntity = Database["public"]["Tables"]["tag_access"]["Row"];

/** Public link entity from database */
export type PublicLinkEntity = Database["public"]["Tables"]["public_links"]["Row"];

/** LLM generation entity from database */
export type LlmGenerationEntity = Database["public"]["Tables"]["llm_generations"]["Row"];

/** Goal status enum from database */
export type GoalStatus = Database["public"]["Enums"]["goal_status_enum"];

// ============================================================================
// Utility Types
// ============================================================================

/**
 * XOR type - ensures exactly one of two fields is provided
 * Used for mutually exclusive fields (e.g., tag_id XOR tag_name)
 *
 * @template T - First type with exclusive field
 * @template U - Second type with exclusive field
 * @example
 * type Config = XOR<{ id: string }, { name: string }>;
 * // Valid: { id: "123" } or { name: "test" }
 * // Invalid: { id: "123", name: "test" } or {}
 */
export type XOR<T, U> = T extends object
  ? U extends object
    ? (Without<T, U> & U) | (Without<U, T> & T)
    : never
  : never;

// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

/**
 * UUID v4 string
 * @example "550e8400-e29b-41d4-a716-446655440000"
 */
export type UUID = string;

/**
 * ISO 8601 date string (YYYY-MM-DD format)
 * @example "2025-10-19"
 */
export type DateISO = string;

/**
 * ISO 8601 timestamp string
 * @example "2025-10-19T10:00:00Z"
 */
export type TimestampISO = string;

/** Sort field for notes list */
export type NotesSortBy = "meeting_date" | "created_at" | "updated_at";

/** Sort order */
export type SortOrder = "asc" | "desc";
// AI Generation DTOs
// ============================================================================

/**
 * Command: Generate AI summary from meeting notes (POST /api/ai/generate)
 * Anonymous endpoint - no authentication required
 */
export interface GenerateAiSummaryCommand {
  /** Raw meeting notes content */
  original_content: string;
  /** AI model name (default: 'openai/gpt-4o-mini') */
  model_name?: LlmGenerationEntity["model_name"];
}

/**
 * DTO: AI-generated summary response (POST /api/ai/generate)
 * Derived from LlmGenerationEntity metrics and NoteEntity fields
 */
export interface AiSummaryDTO {
  /** Generated summary text (AI always returns non-null summary) */
  summary_text: NonNullable<NoteEntity["summary_text"]>;
  /** Goal achievement status */
  goal_status: GoalStatus;
  /** Suggested tag name */
  suggested_tag: NoteEntity["suggested_tag"];
  /** Generation time in milliseconds */
  generation_time_ms: LlmGenerationEntity["generation_time_ms"];
  /** Tokens consumed by AI model */
  tokens_used: NonNullable<LlmGenerationEntity["tokens_used"]>;
}

// ============================================================================
// Notes DTOs
// ============================================================================

/**
 * DTO: Basic tag information embedded in note responses
 * Derived from TagEntity (subset of fields)
 */
export type TagEmbeddedDTO = Pick<TagEntity, "id" | "name">;

/**
 * DTO: Note list item (GET /api/notes)
 * Excludes original_content and suggested_tag for performance; includes computed fields
 */
export type NoteListItemDTO = Omit<NoteEntity, "original_content" | "suggested_tag" | "tag_id" | "user_id"> & {
  /** Tag information */
  tag: TagEmbeddedDTO;
  /** Whether current user owns this note */
  is_owner: boolean;
  /** Whether note has an active public link */
  has_public_link: boolean;
};

/**
 * DTO: Pagination metadata for list responses
 */
export interface PaginationDTO {
  /** Current page number */
  page: number;
  /** Items per page */
  limit: number;
  /** Total items matching filters */
  total: number;
  /** Total pages */
  total_pages: number;
}

/**
 * DTO: Notes list with pagination (GET /api/notes)
 */
export interface NotesListDTO {
  /** Array of note list items */
  notes: NoteListItemDTO[];
  /** Pagination metadata */
  pagination: PaginationDTO;
}

/**
 * Query parameters for GET /api/notes
 * Used for filtering, sorting, and pagination
 */
export interface NotesListQuery {
  /** Filter by specific tag */
  tag_id?: NoteEntity["tag_id"];
  /** Filter by goal achievement status */
  goal_status?: GoalStatus;
  /** Filter from date (YYYY-MM-DD) */
  date_from?: DateISO;
  /** Filter to date (YYYY-MM-DD) */
  date_to?: DateISO;
  /** Page number (default: 1) */
  page?: number;
  /** Items per page (default: 20, max: 100) */
  limit?: number;
  /** Include notes from shared tags (default: false) */
  include_shared?: boolean;
  /** Sort by field (default: 'meeting_date') */
  sort_by?: NotesSortBy;
  /** Sort order (default: 'desc') */
  order?: SortOrder;
}

/**
 * DTO: Public link details embedded in note detail response
 * Derived from PublicLinkEntity (subset, plus computed url field)
 */
export type PublicLinkEmbeddedDTO = Pick<PublicLinkEntity, "token" | "is_enabled"> & {
  /** Public access URL path */
  url: string;
};

/**
 * DTO: Note details (POST /api/notes, PATCH /api/notes/{id})
 * Basic note response without ownership and public link information
 */
export type NoteDTO = Omit<NoteEntity, "tag_id" | "user_id"> & {
  /** Tag information */
  tag: TagEmbeddedDTO;
};

/**
 * DTO: Full note details (GET /api/notes/{id})
 * Includes original_content, ownership info, and optional public_link (only for owners)
 */
export type NoteDetailDTO = NoteDTO & {
  /** Whether current user owns this note */
  is_owner: boolean;
  /** Public link details (null for non-owners or if no link exists) */
  public_link: PublicLinkEmbeddedDTO | null;
};

/**
 * Command: Create new note (POST /api/notes)
 * Requires exactly one of tag_id OR tag_name (XOR logic enforced)
 */
export type CreateNoteCommand = Pick<NoteEntity, "original_content"> &
  Partial<Pick<NoteEntity, "summary_text" | "goal_status" | "suggested_tag" | "meeting_date" | "is_ai_generated">> &
  XOR<{ tag_id: NoteEntity["tag_id"] }, { tag_name: TagEntity["name"] }>;

/**
 * Command: Update note fields (PATCH /api/notes/{id})
 * Partial update - all fields optional
 */
export type UpdateNoteCommand = Partial<Pick<NoteEntity, "summary_text" | "goal_status" | "meeting_date" | "tag_id">>;

// ============================================================================
// Tags DTOs
// ============================================================================

/**
 * DTO: Basic tag information (POST /api/tags, PATCH /api/tags/{id})
 * Derived from TagEntity (excludes user_id)
 */
export type TagDTO = Omit<TagEntity, "user_id">;

/**
 * DTO: Tag with statistics (GET /api/tags)
 * Extends TagDTO with computed aggregates
 */
export type TagWithStatsDTO = TagDTO & {
  /** Number of notes with this tag */
  note_count: number;
  /** Whether current user owns this tag */
  is_owner: boolean;
  /** Number of users with shared access (only for owned tags) */
  shared_recipients?: number;
};

/**
 * DTO: Tags list (GET /api/tags)
 */
export interface TagsListDTO {
  /** Array of tags with statistics */
  tags: TagWithStatsDTO[];
}

/**
 * Query parameters for GET /api/tags
 */
export interface TagsListQuery {
  /** Include tags shared with user (default: false) */
  include_shared?: boolean;
}

/**
 * Command: Create new tag (POST /api/tags)
 */
export type CreateTagCommand = Pick<TagEntity, "name">;

/**
 * Command: Update tag name (PATCH /api/tags/{id})
 */
export type UpdateTagCommand = Pick<TagEntity, "name">;

// ============================================================================
// Tag Access DTOs
// ============================================================================

/**
 * DTO: Tag access recipient details (GET /api/tags/{id}/access)
 * Derived from TagAccessEntity with user email from auth.users
 */
export interface TagAccessRecipientDTO {
  /** Recipient user ID */
  recipient_id: TagAccessEntity["recipient_id"];
  /** Recipient user email */
  email: string;
  /** When access was granted */
  granted_at: TagAccessEntity["created_at"];
}

/**
 * DTO: Tag access list (GET /api/tags/{id}/access)
 */
export interface TagAccessListDTO {
  /** Array of recipients with access */
  recipients: TagAccessRecipientDTO[];
}

/**
 * Command: Grant tag access to user (POST /api/tags/{id}/access)
 * Accepts email, resolves to recipient_id internally
 */
export interface GrantTagAccessCommand {
  /** Recipient email address (must be registered user) */
  recipient_email: string;
}

/**
 * DTO: Tag access granted confirmation (POST /api/tags/{id}/access)
 */
export interface TagAccessGrantedDTO {
  /** Recipient user ID */
  recipient_id: TagAccessEntity["recipient_id"];
  /** Recipient email */
  email: string;
  /** When access was granted */
  granted_at: TagAccessEntity["created_at"];
}

// ============================================================================
// Public Links DTOs
// ============================================================================

/**
 * DTO: Public link details (POST /api/notes/{id}/public-link, PATCH /api/notes/{id}/public-link, POST /api/notes/{id}/public-link/rotate)
 * Derived from PublicLinkEntity with computed url field
 */
export type PublicLinkDTO = Pick<PublicLinkEntity, "token" | "is_enabled"> & {
  /** Public access URL path */
  url: string;
  /** When link was created (not returned by PATCH endpoint) */
  created_at?: PublicLinkEntity["created_at"];
  /** Whether this is a newly created link (only in POST /api/notes/{id}/public-link) */
  is_new?: boolean;
  /** When link was last updated (only in PATCH and rotate) */
  updated_at?: PublicLinkEntity["updated_at"];
};

/**
 * Command: Update public link status (PATCH /api/notes/{id}/public-link)
 * MVP: Only is_enabled can be toggled (optional field)
 */
export type UpdatePublicLinkCommand = Partial<Pick<PublicLinkEntity, "is_enabled">>;

/**
 * DTO: Public note summary (GET /api/public/{token})
 * Anonymous access - excludes original_content and owner info
 */
export type PublicNoteDTO = Pick<NoteEntity, "summary_text" | "meeting_date" | "goal_status"> & {
  /** When public link was created */
  created_at: PublicLinkEntity["created_at"];
};

// ============================================================================
// User DTOs
// ============================================================================

/**
 * DTO: User profile (GET /api/user/profile)
 * Derived from auth.users (Supabase Auth)
 */
export interface UserProfileDTO {
  /** User ID */
  id: string;
  /** User email */
  email: string;
  /** Account creation timestamp */
  created_at: TimestampISO;
}

/**
 * Command: Delete user account (DELETE /api/user/account)
 * Requires email confirmation for safety
 */
export interface DeleteAccountCommand {
  /** User email confirmation (must match) */
  confirmation_email: string;
}

// ============================================================================
// Analytics & Statistics DTOs
// ============================================================================

/**
 * DTO: User generation statistics (GET /api/user/stats)
 * Combines data from user_generation_stats view and aggregate queries
 * Note: Null values from DB are coalesced to 0 in API layer
 */
export interface UserStatsDTO {
  /** Total AI generations */
  total_generations: number;
  /** Successful generations */
  successful_generations: number;
  /** Failed generations */
  failed_generations: number;
  /** Total tokens consumed (coalesced to 0 if null) */
  total_tokens: number;
  /** Average generation time in milliseconds (coalesced to 0 if null) */
  avg_time_ms: number;
  /** Total notes created by user */
  total_notes: number;
  /** Total tags owned by user */
  total_tags: number;
}
