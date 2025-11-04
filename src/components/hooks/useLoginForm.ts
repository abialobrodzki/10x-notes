import { useState, useCallback } from "react";
import { getPendingNote } from "@/lib/utils/pending-note.utils";
import { validateEmail, validatePasswordLogin } from "@/lib/validators/auth.validators";

interface UseLoginFormProps {
  /** Callback for error handling */
  onError: (errors: string[]) => void;
}

/**
 * Hook for managing login form state and logic
 *
 * Features:
 * - Manages form fields: email, password, showPassword
 * - Tracks touched fields for validation display
 * - Validates form inputs before submission
 * - Handles API communication with /api/auth/login
 * - Manages redirect flow with pending note detection
 * - Provides loading state during submission
 *
 * @param onError - Callback for error reporting
 * @returns Form state, handlers, and validation states
 */
export function useLoginForm({ onError }: UseLoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touchedFields, setTouchedFields] = useState({ email: false, password: false });
  const [hasSubmitError, setHasSubmitError] = useState(false);

  /**
   * Validates form inputs
   * @returns Array of validation errors (empty if valid)
   */
  const validateForm = useCallback((): string[] => {
    const errors: string[] = [];
    errors.push(...validateEmail(email));
    errors.push(...validatePasswordLogin(password));
    return errors;
  }, [email, password]);

  /**
   * Mark field as touched when user leaves it
   */
  const handleBlur = useCallback((field: "email" | "password") => {
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
      setTouchedFields({ email: true, password: true });

      // Validate form
      const validationErrors = validateForm();
      if (validationErrors.length > 0) {
        onError(validationErrors);
        return;
      }

      setIsSubmitting(true);

      try {
        // Call server-side login endpoint
        const response = await fetch("/api/auth/login", {
          method: "POST",
          credentials: "include", // Include cookies for server-side session management
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          // Handle API errors
          throw new Error(data.message || "Authentication failed");
        }

        // Login successful - check for pending note
        const pendingNote = getPendingNote();

        if (pendingNote) {
          // Replace current history entry to prevent going back to login page
          window.location.replace("/notes?autoSave=true");
          return;
        }

        // No pending note or expired - replace current history entry
        window.location.replace("/notes");
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Login error:", error);

        // Mark submit as failed - show red borders
        setHasSubmitError(true);

        if (error instanceof Error) {
          onError([error.message]);
        } else {
          onError(["Wystąpił nieoczekiwany błąd. Spróbuj ponownie."]);
        }

        setIsSubmitting(false);
      }
    },
    [email, password, onError, validateForm]
  );

  // Check if email has validation error OR submit failed
  const emailHasError = (touchedFields.email && validateEmail(email).length > 0) || hasSubmitError;
  const passwordHasError = (touchedFields.password && validatePasswordLogin(password).length > 0) || hasSubmitError;

  return {
    // State
    email,
    password,
    showPassword,
    isSubmitting,
    touchedFields,
    hasSubmitError,
    emailHasError,
    passwordHasError,
    // Setters
    setEmail,
    setPassword,
    setShowPassword,
    setHasSubmitError,
    // Handlers
    handleBlur,
    handleSubmit,
  };
}
