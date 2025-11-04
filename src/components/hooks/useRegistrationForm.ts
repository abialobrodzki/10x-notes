import { useState, useCallback } from "react";
import { getPendingNote } from "@/lib/utils/pending-note.utils";
import { validateEmail, validatePasswordRegister, validatePasswordConfirm } from "@/lib/validators/auth.validators";

interface UseRegistrationFormProps {
  /** Callback for error handling */
  onError: (errors: string[]) => void;
}

/**
 * Hook for managing registration form state and logic
 *
 * Features:
 * - Manages form fields: email, password, confirmPassword, showPassword
 * - Tracks touched fields for validation display
 * - Validates form inputs before submission
 * - Handles API communication with /api/auth/register
 * - Manages redirect flow with pending note detection
 * - Provides loading state during submission
 *
 * @param onError - Callback for error reporting
 * @returns Form state, handlers, and validation states
 */
export function useRegistrationForm({ onError }: UseRegistrationFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touchedFields, setTouchedFields] = useState({
    email: false,
    password: false,
    confirmPassword: false,
  });
  const [hasSubmitError, setHasSubmitError] = useState(false);

  /**
   * Validates form inputs
   * @returns Array of validation errors (empty if valid)
   */
  const validateForm = useCallback((): string[] => {
    const errors: string[] = [];
    errors.push(...validateEmail(email));
    errors.push(...validatePasswordRegister(password));
    errors.push(...validatePasswordConfirm(password, confirmPassword));
    return errors;
  }, [email, password, confirmPassword]);

  /**
   * Mark field as touched when user leaves it
   */
  const handleBlur = useCallback((field: "email" | "password" | "confirmPassword") => {
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
      setTouchedFields({ email: true, password: true, confirmPassword: true });

      // Validate form
      const validationErrors = validateForm();
      if (validationErrors.length > 0) {
        onError(validationErrors);
        return;
      }

      setIsSubmitting(true);

      try {
        // Call server-side registration endpoint
        const response = await fetch("/api/auth/register", {
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
          throw new Error(data.message || "Registration failed");
        }

        // Check if email confirmation is required
        if (data.requiresConfirmation || !data.session) {
          // Email confirmation required
          onError([
            data.message ||
              "Rejestracja udana! Sprawdź swoją skrzynkę email i kliknij link potwierdzający, aby aktywować konto.",
          ]);
          setIsSubmitting(false);
          return;
        }

        // Registration successful with immediate session
        // Check for pending generated note in sessionStorage
        const pendingNote = getPendingNote();

        if (pendingNote) {
          // Replace current history entry to prevent going back to register page
          window.location.replace("/notes?autoSave=true");
          return;
        }

        // No pending note or expired - replace current history entry
        window.location.replace("/notes");
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Registration error:", error);

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

  // Check if fields have validation errors OR submit failed
  const emailHasError = (touchedFields.email && validateEmail(email).length > 0) || hasSubmitError;
  const passwordHasError = (touchedFields.password && validatePasswordRegister(password).length > 0) || hasSubmitError;
  const confirmPasswordHasError =
    (touchedFields.confirmPassword && validatePasswordConfirm(password, confirmPassword).length > 0) || hasSubmitError;

  return {
    // State
    email,
    password,
    confirmPassword,
    showPassword,
    isSubmitting,
    touchedFields,
    hasSubmitError,
    emailHasError,
    passwordHasError,
    confirmPasswordHasError,
    // Handlers
    setEmail,
    setPassword,
    setConfirmPassword,
    setShowPassword,
    setHasSubmitError,
    handleBlur,
    handleSubmit,
  };
}
