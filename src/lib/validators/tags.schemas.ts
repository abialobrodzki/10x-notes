import { z } from "zod";

/**
 * Validation schema for GET /api/tags query parameters
 * Handles filtering for tags list
 */
export const tagsListQuerySchema = z.object({
  /**
   * Include tags shared with user (default: false)
   * When true, includes tags from tag_access table where recipient_id = current_user
   */
  include_shared: z.coerce.boolean().default(false),
});

/**
 * TypeScript type inferred from Zod schema
 * Use this type for validated query parameters
 */
export type TagsListQueryInput = z.infer<typeof tagsListQuerySchema>;

/**
 * Validation schema for POST /api/tags
 * Creates a new tag with unique name validation
 */
export const createTagSchema = z.object({
  /**
   * Tag name - must be unique per user (case-insensitive)
   * Automatically trimmed, 1-100 characters
   */
  name: z.string().trim().min(1, "Tag name is required").max(100, "Tag name must be at most 100 characters"),
});

/**
 * TypeScript type inferred from Zod schema
 * Use this type for validated tag creation input
 */
export type CreateTagInput = z.infer<typeof createTagSchema>;
