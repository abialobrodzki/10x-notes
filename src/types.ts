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
  model_name?: string;
}

/**
 * DTO: AI-generated summary response (POST /api/ai/generate)
 * Derived from LlmGenerationEntity metrics and NoteEntity fields
 */
export interface AiSummaryDTO {
  /** Generated summary text */
  summary_text: string;
  /** Goal achievement status */
  goal_status: GoalStatus | null;
  /** Suggested tag name */
  suggested_tag: string | null;
  /** Generation time in milliseconds */
  generation_time_ms: number;
  /** Tokens consumed by AI model */
  tokens_used: number | null;
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
 * Excludes original_content for performance; includes computed fields
 */
export type NoteListItemDTO = Omit<NoteEntity, "original_content" | "tag_id" | "user_id"> & {
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
 * DTO: Public link details embedded in note detail response
 * Derived from PublicLinkEntity (subset, plus computed url field)
 */
export type PublicLinkEmbeddedDTO = Pick<PublicLinkEntity, "token" | "is_enabled"> & {
  /** Public access URL path */
  url: string;
};

/**
 * DTO: Full note details (GET /api/notes/{id}, POST /api/notes, PATCH /api/notes/{id})
 * Includes original_content and optional public_link (only for owners)
 */
export type NoteDetailDTO = Omit<NoteEntity, "tag_id" | "user_id"> & {
  /** Tag information */
  tag: TagEmbeddedDTO;
  /** Whether current user owns this note */
  is_owner: boolean;
  /** Public link details (null for non-owners or if no link exists) */
  public_link: PublicLinkEmbeddedDTO | null;
};

/**
 * Command: Create new note (POST /api/notes)
 * Requires either tag_id OR tag_name (XOR logic)
 */
export type CreateNoteCommand = Pick<NoteEntity, "original_content"> &
  Partial<Pick<NoteEntity, "summary_text" | "goal_status" | "suggested_tag" | "meeting_date" | "is_ai_generated">> & {
    /** Existing tag ID (XOR with tag_name) */
    tag_id?: string;
    /** Tag name (find existing or create new - XOR with tag_id) */
    tag_name?: string;
  };

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
export type TagAccessRecipientDTO = Pick<TagAccessEntity, "id"> & {
  /** Recipient user email */
  email: string;
  /** When access was granted */
  granted_at: string;
};

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
  recipient_id: string;
  /** Recipient email */
  email: string;
  /** When access was granted */
  granted_at: string;
}

// ============================================================================
// Public Links DTOs
// ============================================================================

/**
 * DTO: Public link details (POST /api/notes/{id}/public-link, PATCH /api/notes/{id}/public-link, POST /api/notes/{id}/public-link/rotate)
 * Derived from PublicLinkEntity with computed url field
 */
export type PublicLinkDTO = Pick<PublicLinkEntity, "token" | "is_enabled" | "created_at"> & {
  /** Public access URL path */
  url: string;
  /** Whether this is a newly created link (only in POST /api/notes/{id}/public-link) */
  is_new?: boolean;
  /** When link was last updated (only in PATCH and rotate) */
  updated_at?: string;
};

/**
 * Command: Update public link status (PATCH /api/notes/{id}/public-link)
 */
export type UpdatePublicLinkCommand = Pick<PublicLinkEntity, "is_enabled">;

/**
 * DTO: Public note summary (GET /api/public/{token})
 * Anonymous access - excludes original_content and owner info
 */
export type PublicNoteDTO = Pick<NoteEntity, "summary_text" | "meeting_date" | "goal_status"> & {
  /** When public link was created */
  created_at: string;
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
  created_at: string;
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
 */
export interface UserStatsDTO {
  /** Total AI generations */
  total_generations: number;
  /** Successful generations */
  successful_generations: number;
  /** Failed generations */
  failed_generations: number;
  /** Total tokens consumed */
  total_tokens: number | null;
  /** Average generation time in milliseconds */
  avg_time_ms: number | null;
  /** Total notes created by user */
  total_notes: number;
  /** Total tags owned by user */
  total_tags: number;
}
