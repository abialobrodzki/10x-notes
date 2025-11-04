import { useState, useCallback, useId } from "react";
import PasswordStrengthIndicator from "@/components/PasswordStrengthIndicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPendingNote } from "@/lib/utils/pending-note.utils";
import { validateEmail, validatePasswordRegister, validatePasswordConfirm } from "@/lib/validators/auth.validators";

interface RegisterFormProps {
  onError: (errors: string[]) => void;
}

/**
 * RegisterForm component - email/password registration
 * Integrates with Supabase Auth and handles pending note auto-save flow
 * - Checks sessionStorage for pending notes after successful registration
 * - Redirects to /notes?autoSave=true if pending note exists
 */
export default function RegisterForm({ onError }: RegisterFormProps) {
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

  const emailId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();
  const showPasswordId = useId();

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

  // Check if fields have validation errors OR submit failed
  const emailHasError = (touchedFields.email && validateEmail(email).length > 0) || hasSubmitError;
  const passwordHasError = (touchedFields.password && validatePasswordRegister(password).length > 0) || hasSubmitError;
  const confirmPasswordHasError =
    (touchedFields.confirmPassword && validatePasswordConfirm(password, confirmPassword).length > 0) || hasSubmitError;

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

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate data-testid="register-form">
      {/* Email input */}
      <div className="space-y-2">
        <Label htmlFor={emailId} className="text-glass-text">
          Email
        </Label>
        <Input
          id={emailId}
          type="email"
          placeholder="twoj@email.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (hasSubmitError) setHasSubmitError(false);
          }}
          onBlur={() => handleBlur("email")}
          disabled={isSubmitting}
          autoComplete="email"
          required
          aria-required="true"
          aria-invalid={emailHasError ? "true" : "false"}
          className="border-input-border bg-input-bg text-input-text placeholder:text-input-placeholder"
          data-testid="register-form-email-input"
        />
      </div>

      {/* Password input */}
      <div className="space-y-2">
        <Label htmlFor={passwordId} className="text-glass-text">
          Hasło
        </Label>
        <Input
          id={passwordId}
          type={showPassword ? "text" : "password"}
          placeholder="Co najmniej 8 znaków"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (hasSubmitError) setHasSubmitError(false);
          }}
          onBlur={() => handleBlur("password")}
          disabled={isSubmitting}
          autoComplete="new-password"
          required
          aria-required="true"
          aria-invalid={passwordHasError ? "true" : "false"}
          className="border-input-border bg-input-bg text-input-text placeholder:text-input-placeholder"
          data-testid="register-form-password-input"
        />
        {/* Password strength indicator */}
        <PasswordStrengthIndicator password={password} />
      </div>

      {/* Confirm Password input */}
      <div className="space-y-2">
        <Label htmlFor={confirmPasswordId} className="text-glass-text">
          Potwierdź hasło
        </Label>
        <Input
          id={confirmPasswordId}
          type={showPassword ? "text" : "password"}
          placeholder="Powtórz hasło"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (hasSubmitError) setHasSubmitError(false);
          }}
          onBlur={() => handleBlur("confirmPassword")}
          disabled={isSubmitting}
          autoComplete="new-password"
          required
          aria-required="true"
          aria-invalid={confirmPasswordHasError ? "true" : "false"}
          className="border-input-border bg-input-bg text-input-text placeholder:text-input-placeholder"
          data-testid="register-form-confirm-password-input"
        />
      </div>

      {/* Show password checkbox */}
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id={showPasswordId}
          checked={showPassword}
          onChange={(e) => setShowPassword(e.target.checked)}
          disabled={isSubmitting}
          className="h-4 w-4 rounded border-input-border bg-input-bg text-gradient-button-from focus:ring-2 focus:ring-gradient-button-from"
        />
        <Label htmlFor={showPasswordId} className="text-sm font-normal text-glass-text-muted">
          Pokaż hasło
        </Label>
      </div>

      {/* Submit button */}
      <Button
        type="submit"
        variant="gradient"
        disabled={isSubmitting}
        className="w-full"
        data-testid="register-form-submit-button"
      >
        {isSubmitting ? "Rejestracja..." : "Zarejestruj się"}
      </Button>
    </form>
  );
}
