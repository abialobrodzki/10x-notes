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
