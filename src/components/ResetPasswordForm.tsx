import { useId } from "react";
import { useResetPasswordForm } from "@/components/hooks/useResetPasswordForm";
import PasswordStrengthIndicator from "@/components/PasswordStrengthIndicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const {
    password,
    confirmPassword,
    showPassword,
    isSubmitting,
    hasSubmitError,
    passwordHasError,
    confirmPasswordHasError,
    setPassword,
    setConfirmPassword,
    setShowPassword,
    setHasSubmitError,
    handleBlur,
    handleSubmit,
  } = useResetPasswordForm({ onError, onSuccess });

  const passwordId = useId();
  const confirmPasswordId = useId();
  const showPasswordId = useId();

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate data-testid="reset-password-form">
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
          data-testid="reset-password-form-password-input"
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
          data-testid="reset-password-form-confirm-password-input"
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
        data-testid="reset-password-form-submit-button"
      >
        {isSubmitting ? "Ustawianie hasła..." : "Ustaw nowe hasło"}
      </Button>
    </form>
  );
}
