import { z } from "zod";

/**
 * Validation schema for tag ID path parameter
 * Used in endpoints like /api/tags/{id}, /api/tags/{id}/access
 */
export const tagIdParamSchema = z.object({
  /**
   * Tag ID - must be valid UUID v4
   */
  id: z.string().uuid("Invalid tag ID format"),
});

/**
 * TypeScript type inferred from Zod schema
 * Use this type for validated tag ID path parameter
 */
export type TagIdParamInput = z.infer<typeof tagIdParamSchema>;

/**
 * Validation schema for GET /api/tags query parameters
 * Handles filtering for tags list
 */
export const tagsListQuerySchema = z.object({
  /**
   * Include tags shared with user (default: true)
   * When true, includes tags from tag_access table where recipient_id = current_user
   */
  include_shared: z.coerce.boolean().default(true),
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

/**
 * Validation schema for PATCH /api/tags/{id}
 * Updates tag name (must be unique per user)
 */
export const updateTagSchema = z.object({
  /**
   * New tag name - must be unique per user (case-insensitive)
   * Automatically trimmed, 1-100 characters
   */
  name: z.string().trim().min(1, "Tag name is required").max(100, "Tag name must be at most 100 characters"),
});

/**
 * TypeScript type inferred from Zod schema
 * Use this type for validated tag update input
 */
export type UpdateTagInput = z.infer<typeof updateTagSchema>;

/**
 * Validation schema for POST /api/tags/{id}/access
 * Grants access to a tag to another user by email
 */
export const grantTagAccessSchema = z.object({
  /**
   * Recipient email address - must be valid email format
   * User must exist in the system (auth.users)
   */
  recipient_email: z.string().email("Invalid email format"),
});

/**
 * TypeScript type inferred from Zod schema
 * Use this type for validated grant tag access input
 */
export type GrantTagAccessInput = z.infer<typeof grantTagAccessSchema>;

/**
 * Validation schema for AddRecipientForm
 * Used to add a new recipient/user to share a tag with
 * Validates email format for new recipients
 */
export const addRecipientSchema = z.object({
  /**
   * Email address of recipient to add access for
   * Must be valid email format
   * User must exist in the system (auth.users) with verified email
   */
  email: z.string().email("Podaj poprawny adres email").min(1, "Email jest wymagany"),
});

/**
 * TypeScript type inferred from addRecipient schema
 * Use this type for validated add recipient form input
 */
export type AddRecipientInput = z.infer<typeof addRecipientSchema>;
