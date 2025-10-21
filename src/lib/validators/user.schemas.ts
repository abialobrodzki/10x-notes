import { z } from "zod";

/**
 * Validation schema for DELETE /api/user/account
 * Requires email confirmation for safety - prevents accidental account deletion
 *
 * SECURITY NOTE: This is an irreversible operation that cascades to delete:
 * - All user notes
 * - All user tags
 * - All tag access permissions
 * - All public links
 */
export const deleteAccountSchema = z.object({
  /**
   * Email confirmation - must match user's account email
   * Required for safety to prevent accidental deletions
   */
  confirmation_email: z.string().email("Invalid email format"),
});

/**
 * TypeScript type inferred from Zod schema
 * Use this type for validated account deletion input
 */
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
