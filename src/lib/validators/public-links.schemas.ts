import { z } from "zod";

/**
 * Validation schema for POST /api/notes/{id}/public-link
 * Creates a public link for a note
 *
 * MVP: No fields required. Empty body or omit entirely.
 * Post-MVP: May include expiration_date field
 */
export const createPublicLinkSchema = z.object({});

/**
 * TypeScript type inferred from Zod schema
 * Use this type for validated public link creation input
 */
export type CreatePublicLinkInput = z.infer<typeof createPublicLinkSchema>;

/**
 * Validation schema for PATCH /api/notes/{id}/public-link
 * Updates public link settings (MVP: only is_enabled toggle)
 *
 * Requirements:
 * - At least one field must be provided
 * - is_enabled: optional boolean to enable/disable the link
 *
 * Post-MVP: May include expiration_date update
 */
export const patchPublicLinkSchema = z
  .object({
    is_enabled: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "No fields to update",
  });

/**
 * TypeScript type inferred from Zod schema
 * Use this type for validated public link update input
 */
export type PatchPublicLinkInput = z.infer<typeof patchPublicLinkSchema>;
