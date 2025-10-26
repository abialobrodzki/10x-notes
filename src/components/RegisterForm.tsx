import { useState, useCallback, useId } from "react";
import PasswordStrengthIndicator from "@/components/PasswordStrengthIndicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabaseClient } from "@/db/supabase.client";
import { validateEmail, validatePasswordRegister, validatePasswordConfirm } from "@/lib/validators/auth.validators";

interface RegisterFormProps {
  onError: (errors: string[]) => void;
}

/**
 * RegisterForm component - email/password registration
 * Integrates with Supabase Auth and handles pendingGeneratedNote flow
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
        // Register with Supabase
        const { data, error } = await supabaseClient.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
          },
        });

        if (error) {
          throw error;
        }

        // Check if email confirmation is required
        if (data.user && !data.session) {
          // Email confirmation required
          onError(["Rejestracja udana! Sprawdź swoją skrzynkę email i potwierdź adres, aby się zalogować."]);
          setIsSubmitting(false);
          return;
        }

        if (!data.session) {
          throw new Error("Nie udało się utworzyć sesji");
        }

        // Registration successful with immediate session
        // Check for pending generated note in localStorage
        const pendingNote = localStorage.getItem("pendingGeneratedNote");

        if (pendingNote) {
          try {
            const noteData = JSON.parse(pendingNote);
            const timestamp = noteData.timestamp;

            // Check if note is still valid (24h TTL)
            const now = Date.now();
            const ttl = 24 * 60 * 60 * 1000; // 24 hours

            if (now - timestamp < ttl) {
              // Redirect to notes view with flag to show save dialog
              window.location.href = "/notes?showPendingNote=true";
              return;
            } else {
              // Remove expired note
              localStorage.removeItem("pendingGeneratedNote");
            }
          } catch {
            // Invalid data format, remove it
            localStorage.removeItem("pendingGeneratedNote");
          }
        }

        // No pending note or expired - redirect to notes
        window.location.href = "/notes";
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Registration error:", error);

        // Mark submit as failed - show red borders
        setHasSubmitError(true);

        if (error instanceof Error) {
          // Handle specific Supabase errors
          if (error.message.includes("User already registered")) {
            onError(["Ten adres email jest już zarejestrowany"]);
          } else if (error.message.includes("Password should be at least")) {
            onError(["Hasło musi mieć co najmniej 8 znaków"]);
          } else if (error.message.includes("Unable to validate email")) {
            onError(["Nieprawidłowy format adresu email"]);
          } else {
            onError([error.message]);
          }
        } else {
          onError(["Wystąpił nieoczekiwany błąd. Spróbuj ponownie."]);
        }

        setIsSubmitting(false);
      }
    },
    [email, password, onError, validateForm]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
      <Button type="submit" variant="gradient" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Rejestracja..." : "Zarejestruj się"}
      </Button>
    </form>
  );
}
