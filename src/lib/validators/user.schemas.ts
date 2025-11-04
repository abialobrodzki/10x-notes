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

/**
 * Validation schema for DeleteAccountForm/DeleteAccountWizard
 * Requires email confirmation and explicit consent checkbox
 * Frontend form validation - complements deleteAccountSchema
 */
export const deleteAccountFormSchema = z
  .object({
    /**
     * Email confirmation - must match user's account email
     * Required for safety to prevent accidental deletions
     */
    confirmation_email: z.string().email("Podaj poprawny adres email").min(1, "Email jest wymagany"),

    /**
     * Explicit confirmation checkbox
     * User must check this to confirm they understand the consequences
     */
    isConfirmed: z.boolean().refine((val) => val === true, {
      message: "Musisz potwierdzić, że rozumiesz konsekwencje",
    }),
  })
  .refine((data) => data.isConfirmed, {
    message: "Musisz potwierdzić, że rozumiesz konsekwencje",
    path: ["isConfirmed"],
  });

/**
 * TypeScript type inferred from delete account form schema
 * Use this type for validated delete account form input
 */
export type DeleteAccountFormInput = z.infer<typeof deleteAccountFormSchema>;
