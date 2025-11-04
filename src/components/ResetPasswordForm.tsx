import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import PasswordStrengthIndicator from "@/components/PasswordStrengthIndicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabaseClient } from "@/db/supabase.client";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validators/auth.schemas";

interface ResetPasswordFormProps {
  token: string;
  onError: (errors: string[]) => void;
  onSuccess: (success: boolean) => void;
}

/**
 * ResetPasswordForm component - password reset form
 * Uses React Hook Form for state management and Zod for validation
 * Integrates with Supabase Auth to update user password
 * Validates password strength and confirmation
 * Token from URL automatically authenticates the user
 */
export default function ResetPasswordForm({ token: _token, onError, onSuccess }: ResetPasswordFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [hasSubmitError, setHasSubmitError] = useState(false);

  const {
    register,
    handleSubmit: handleReactHookFormSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onBlur",
  });

  const password = watch("password");

  const handleSubmit = async (data: ResetPasswordInput) => {
    onError([]);
    setHasSubmitError(false);

    try {
      const { error } = await supabaseClient.auth.updateUser({
        password: data.password,
      });

      if (error) {
        throw error;
      }

      // Success - show confirmation message
      onSuccess(true);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Password reset error:", error);

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
    }
  };

  const passwordError = errors.password || (hasSubmitError ? errors.password : null);
  const confirmPasswordError = errors.confirmPassword || (hasSubmitError ? errors.confirmPassword : null);

  return (
    <form
      onSubmit={handleReactHookFormSubmit(handleSubmit)}
      className="space-y-4"
      noValidate
      data-testid="reset-password-form"
    >
      {/* Password input */}
      <div className="space-y-2">
        <Label className="text-glass-text">Nowe hasło</Label>
        <Input
          type={showPassword ? "text" : "password"}
          placeholder="Minimum 8 znaków"
          disabled={isSubmitting}
          autoComplete="new-password"
          aria-required="true"
          aria-invalid={!!passwordError}
          className="border-input-border bg-input-bg text-input-text placeholder:text-input-placeholder"
          data-testid="reset-password-form-password-input"
          {...register("password")}
        />
        {passwordError && <p className="text-sm text-destructive">{passwordError.message}</p>}
        {/* Password strength indicator */}
        <PasswordStrengthIndicator password={password} />
      </div>

      {/* Confirm password input */}
      <div className="space-y-2">
        <Label className="text-glass-text">Potwierdź hasło</Label>
        <Input
          type={showPassword ? "text" : "password"}
          placeholder="Powtórz hasło"
          disabled={isSubmitting}
          autoComplete="new-password"
          aria-required="true"
          aria-invalid={!!confirmPasswordError}
          className="border-input-border bg-input-bg text-input-text placeholder:text-input-placeholder"
          data-testid="reset-password-form-confirm-password-input"
          {...register("confirmPassword")}
        />
        {confirmPasswordError && <p className="text-sm text-destructive">{confirmPasswordError.message}</p>}
      </div>

      {/* Show password checkbox */}
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="show-password"
          checked={showPassword}
          onChange={(e) => setShowPassword(e.target.checked)}
          disabled={isSubmitting}
          className="h-4 w-4 rounded border-input-border bg-input-bg text-gradient-button-from focus:ring-2 focus:ring-gradient-button-from"
        />
        <Label htmlFor="show-password" className="text-sm font-normal text-glass-text-muted">
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
