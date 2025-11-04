import { useState, useCallback } from "react";
import { supabaseClient } from "@/db/supabase.client";
import { validatePasswordRegister, validatePasswordConfirm } from "@/lib/validators/auth.validators";

interface UseResetPasswordFormProps {
  /** Callback for error handling */
  onError: (errors: string[]) => void;
  /** Callback for success */
  onSuccess: (success: boolean) => void;
}

/**
 * Hook for managing reset password form state and logic
 *
 * Features:
 * - Manages form fields: password, confirmPassword, showPassword
 * - Tracks touched fields for validation display
 * - Validates form inputs before submission
 * - Handles Supabase Auth password update
 * - Manages loading state during submission
 * - Handles specific Supabase errors (e.g., password must be different)
 *
 * @param onError - Callback for error reporting
 * @param onSuccess - Callback for successful password reset
 * @returns Form state, handlers, and validation states
 */
export function useResetPasswordForm({ onError, onSuccess }: UseResetPasswordFormProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touchedFields, setTouchedFields] = useState({ password: false, confirmPassword: false });
  const [hasSubmitError, setHasSubmitError] = useState(false);

  /**
   * Validates form inputs
   * @returns Array of validation errors (empty if valid)
   */
  const validateForm = useCallback((): string[] => {
    const errors: string[] = [];
    errors.push(...validatePasswordRegister(password));
    errors.push(...validatePasswordConfirm(password, confirmPassword));
    return errors;
  }, [password, confirmPassword]);

  /**
   * Mark field as touched when user leaves it
   */
  const handleBlur = useCallback((field: "password" | "confirmPassword") => {
    setTouchedFields((prev) => ({ ...prev, [field]: true }));
  }, []);

  /**
   * Handles form submission with Supabase Auth
   */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Clear previous errors
      onError([]);

      // Mark all fields as touched on submit
      setTouchedFields({ password: true, confirmPassword: true });

      // Validate form
      const validationErrors = validateForm();
      if (validationErrors.length > 0) {
        onError(validationErrors);
        return;
      }

      setIsSubmitting(true);

      try {
        // Update user password with Supabase
        // Token from URL automatically authenticates the user
        const { error } = await supabaseClient.auth.updateUser({
          password,
        });

        if (error) {
          throw error;
        }

        // Success - show confirmation message
        onSuccess(true);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Password reset error:", error);

        // Mark submit as failed - show red borders
        setHasSubmitError(true);

        if (error instanceof Error) {
          // Handle specific Supabase errors
          if (error.message.includes("New password should be different")) {
            onError(["Nowe hasło musi różnić się od starego hasła"]);
          } else {
            onError([error.message]);
          }
        } else {
          onError(["Wystąpił nieoczekiwany błąd. Spróbuj ponownie."]);
        }

        setIsSubmitting(false);
      }
    },
    [password, onError, onSuccess, validateForm]
  );

  // Check if password fields have validation errors OR submit failed
  const passwordHasError = (touchedFields.password && validatePasswordRegister(password).length > 0) || hasSubmitError;
  const confirmPasswordHasError =
    (touchedFields.confirmPassword && validatePasswordConfirm(password, confirmPassword).length > 0) || hasSubmitError;

  return {
    // State
    password,
    confirmPassword,
    showPassword,
    isSubmitting,
    touchedFields,
    hasSubmitError,
    passwordHasError,
    confirmPasswordHasError,
    // Setters
    setPassword,
    setConfirmPassword,
    setShowPassword,
    setHasSubmitError,
    // Handlers
    handleBlur,
    handleSubmit,
  };
}
