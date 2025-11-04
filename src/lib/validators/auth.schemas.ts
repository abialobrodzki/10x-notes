import { z } from "zod";

/**
 * Validation schema for login form (email/password authentication)
 * Used in LoginForm component and /api/auth/login endpoint
 */
export const loginSchema = z.object({
  /**
   * User email address
   * Must be valid email format
   */
  email: z.string().email("Podaj poprawny adres email"),

  /**
   * User password
   * Required field
   */
  password: z.string().min(1, "Hasło jest wymagane"),
});

/**
 * TypeScript type inferred from login schema
 * Use this type for validated login form input
 */
export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Validation schema for registration form
 * Used in RegisterForm component and /api/auth/register endpoint
 * Includes password confirmation and matching validation
 */
export const registerSchema = z
  .object({
    /**
     * User email address
     * Must be valid email format
     */
    email: z.string().email("Podaj poprawny adres email"),

    /**
     * User password
     * Must be at least 8 characters
     */
    password: z.string().min(8, "Hasło musi mieć co najmniej 8 znaków"),

    /**
     * Password confirmation
     * Must match password field
     */
    confirmPassword: z.string().min(1, "Potwierdzenie hasła jest wymagane"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła muszą być identyczne",
    path: ["confirmPassword"], // This sets which field the error appears on
  });

/**
 * TypeScript type inferred from registration schema
 * Use this type for validated registration form input
 */
export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Validation schema for password reset form
 * Used in ResetPasswordForm component and Supabase Auth password update
 * Includes password confirmation and matching validation
 */
export const resetPasswordSchema = z
  .object({
    /**
     * New password
     * Must be at least 8 characters
     */
    password: z.string().min(8, "Hasło musi mieć co najmniej 8 znaków"),

    /**
     * Password confirmation
     * Must match password field
     */
    confirmPassword: z.string().min(1, "Potwierdzenie hasła jest wymagane"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła muszą być identyczne",
    path: ["confirmPassword"],
  });

/**
 * TypeScript type inferred from reset password schema
 * Use this type for validated password reset form input
 */
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/**
 * Validation schema for forgot password form
 * Used in ForgotPasswordForm component and /api/auth/forgot-password endpoint
 * Simple email validation for password reset request
 */
export const forgotPasswordSchema = z.object({
  /**
   * User email address
   * Must be valid email format
   * Used to send password reset email
   */
  email: z.string().email("Podaj poprawny adres email"),
});

/**
 * TypeScript type inferred from forgot password schema
 * Use this type for validated forgot password form input
 */
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
