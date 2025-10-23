import { useState, useCallback, useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabaseClient } from "@/db/supabase.client";

interface LoginFormProps {
  onError: (errors: string[]) => void;
}

/**
 * LoginForm component - email/password authentication
 * Integrates with Supabase Auth and handles pendingGeneratedNote flow
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

    // Email validation
    if (!email.trim()) {
      errors.push("Adres email jest wymagany");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push("Podaj poprawny adres email");
    }

    // Password validation
    if (!password) {
      errors.push("Hasło jest wymagane");
    }

    return errors;
  }, [email, password]);

  /**
   * Mark field as touched when user leaves it
   */
  const handleBlur = useCallback((field: "email" | "password") => {
    setTouchedFields((prev) => ({ ...prev, [field]: true }));
  }, []);

  // Check if email has validation error OR submit failed
  const emailHasError =
    (touchedFields.email && (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) || hasSubmitError;
  const passwordHasError = (touchedFields.password && !password) || hasSubmitError;

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
        // Authenticate with Supabase
        const { data, error } = await supabaseClient.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          throw error;
        }

        if (!data.session) {
          throw new Error("Nie udało się utworzyć sesji");
        }

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
        console.error("Login error:", error);

        // Mark submit as failed - show red borders
        setHasSubmitError(true);

        if (error instanceof Error) {
          // Handle specific Supabase errors
          if (error.message.includes("Invalid login credentials")) {
            onError(["Nieprawidłowy email lub hasło"]);
          } else if (error.message.includes("Email not confirmed")) {
            onError(["Potwierdź swój adres email przed zalogowaniem"]);
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
      <Button
        type="submit"
        className="w-full bg-gradient-to-r from-gradient-button-from to-gradient-button-to font-semibold text-white transition-all hover:from-purple-600 hover:to-pink-600 hover:shadow-lg disabled:from-gray-500 disabled:to-gray-600 disabled:opacity-50"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Logowanie..." : "Zaloguj się"}
      </Button>
    </form>
  );
}
