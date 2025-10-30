import { useState, useCallback, useId } from "react";
import PasswordStrengthIndicator from "@/components/PasswordStrengthIndicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabaseClient } from "@/db/supabase.client";
import { validatePasswordRegister, validatePasswordConfirm } from "@/lib/validators/auth.validators";

interface ResetPasswordFormProps {
  token: string;
  onError: (errors: string[]) => void;
  onSuccess: (success: boolean) => void;
}

/**
 * ResetPasswordForm component - password reset form
 * Integrates with Supabase Auth to update user password
 * Validates password strength and confirmation
 * Token from URL automatically authenticates the user
 */
export default function ResetPasswordForm({ token: _token, onError, onSuccess }: ResetPasswordFormProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touchedFields, setTouchedFields] = useState({ password: false, confirmPassword: false });
  const [hasSubmitError, setHasSubmitError] = useState(false);

  const passwordId = useId();
  const confirmPasswordId = useId();
  const showPasswordId = useId();

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

  // Check if password fields have validation errors OR submit failed
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Password input */}
      <div className="space-y-2">
        <Label htmlFor={passwordId} className="text-glass-text">
          Nowe hasło
        </Label>
        <Input
          id={passwordId}
          type={showPassword ? "text" : "password"}
          placeholder="Minimum 8 znaków"
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

      {/* Confirm password input */}
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
        {isSubmitting ? "Ustawianie hasła..." : "Ustaw nowe hasło"}
      </Button>
    </form>
  );
}
