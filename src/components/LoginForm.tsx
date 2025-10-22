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
   * Handles form submission with Supabase Auth
   */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Clear previous errors
      onError([]);

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
        <Label htmlFor={emailId} className="text-blue-100">
          Email
        </Label>
        <Input
          id={emailId}
          type="email"
          placeholder="twoj@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSubmitting}
          autoComplete="email"
          required
          aria-required="true"
          aria-invalid={!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "true" : "false"}
          className="border-white/20 bg-white/10 text-white placeholder:text-white/50 focus:border-white/40 focus:ring-white/30"
        />
      </div>

      {/* Password input */}
      <div className="space-y-2">
        <Label htmlFor={passwordId} className="text-blue-100">
          Hasło
        </Label>
        <Input
          id={passwordId}
          type={showPassword ? "text" : "password"}
          placeholder="Twoje hasło"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isSubmitting}
          autoComplete="current-password"
          required
          aria-required="true"
          aria-invalid={!password ? "true" : "false"}
          className="border-white/20 bg-white/10 text-white placeholder:text-white/50 focus:border-white/40 focus:ring-white/30"
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
          className="h-4 w-4 rounded border-white/30 bg-white/10 text-purple-500 focus:ring-2 focus:ring-purple-400"
        />
        <Label htmlFor={showPasswordId} className="text-sm font-normal text-blue-100/90">
          Pokaż hasło
        </Label>
      </div>

      {/* Submit button */}
      <Button
        type="submit"
        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 font-semibold text-white transition-all hover:from-purple-600 hover:to-pink-600 hover:shadow-lg disabled:from-gray-500 disabled:to-gray-600 disabled:opacity-50"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Logowanie..." : "Zaloguj się"}
      </Button>
    </form>
  );
}
