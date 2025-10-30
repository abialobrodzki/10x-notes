import { useState, useCallback, useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validateEmail } from "@/lib/validators/auth.validators";

interface ForgotPasswordFormProps {
  onError: (errors: string[]) => void;
  onSuccess: (success: boolean) => void;
}

/**
 * ForgotPasswordForm component - password reset request form
 * Integrates with Supabase Auth to send password reset email
 * Validates email and handles submission flow
 */
export default function ForgotPasswordForm({ onError, onSuccess }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touchedFields, setTouchedFields] = useState({ email: false });
  const [hasSubmitError, setHasSubmitError] = useState(false);

  const emailId = useId();

  /**
   * Validates form inputs
   * @returns Array of validation errors (empty if valid)
   */
  const validateForm = useCallback((): string[] => {
    return validateEmail(email);
  }, [email]);

  /**
   * Mark field as touched when user leaves it
   */
  const handleBlur = useCallback(() => {
    setTouchedFields({ email: true });
  }, []);

  // Check if email has validation error OR submit failed
  const emailHasError = (touchedFields.email && validateEmail(email).length > 0) || hasSubmitError;

  /**
   * Handles form submission with Supabase Auth
   */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Clear previous errors
      onError([]);

      // Mark all fields as touched on submit
      setTouchedFields({ email: true });

      // Validate form
      const validationErrors = validateForm();
      if (validationErrors.length > 0) {
        onError(validationErrors);
        return;
      }

      setIsSubmitting(true);

      try {
        // Call server-side forgot password endpoint
        const response = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          // Handle API errors
          throw new Error(data.message || "Password reset request failed");
        }

        // Success - show confirmation message
        // Note: For security, we don't reveal if email exists
        onSuccess(true);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Password reset request error:", error);

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
    [email, onError, onSuccess, validateForm]
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
          onBlur={handleBlur}
          disabled={isSubmitting}
          autoComplete="email"
          required
          aria-required="true"
          aria-invalid={emailHasError ? "true" : "false"}
          className="border-input-border bg-input-bg text-input-text placeholder:text-input-placeholder"
        />
      </div>

      {/* Submit button */}
      <Button type="submit" variant="gradient" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Wysyłanie..." : "Wyślij link resetujący"}
      </Button>
    </form>
  );
}
