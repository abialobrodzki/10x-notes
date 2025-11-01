import { useState, useCallback, useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPendingNote } from "@/lib/utils/pending-note.utils";
import { validateEmail, validatePasswordLogin } from "@/lib/validators/auth.validators";

interface LoginFormProps {
  onError: (errors: string[]) => void;
}

/**
 * LoginForm component - email/password authentication
 * Integrates with Supabase Auth and handles pending note auto-save flow
 * - Checks sessionStorage for pending notes after successful login
 * - Redirects to /notes?autoSave=true if pending note exists
 */
export default function LoginForm({ onError }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touchedFields, setTouchedFields] = useState({ email: false, password: false });
  const [hasSubmitError, setHasSubmitError] = useState(false);

  const emailId = useId();
  const passwordId = useId();
  const showPasswordId = useId();

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

  // Check if email has validation error OR submit failed
  const emailHasError = (touchedFields.email && validateEmail(email).length > 0) || hasSubmitError;
  const passwordHasError = (touchedFields.password && validatePasswordLogin(password).length > 0) || hasSubmitError;

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
          placeholder="Twoje hasło"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (hasSubmitError) setHasSubmitError(false);
          }}
          onBlur={() => handleBlur("password")}
          disabled={isSubmitting}
          autoComplete="current-password"
          required
          aria-required="true"
          aria-invalid={passwordHasError ? "true" : "false"}
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
        {isSubmitting ? "Logowanie..." : "Zaloguj się"}
      </Button>
    </form>
  );
}
