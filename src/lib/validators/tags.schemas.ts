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
