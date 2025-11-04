import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import PasswordStrengthIndicator from "@/components/PasswordStrengthIndicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useResetPasswordMutation } from "@/hooks/mutations/useResetPasswordMutation";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validators/auth.schemas";

interface ResetPasswordFormProps {
  token: string;
  onError: (errors: string[]) => void;
  onSuccess: (success: boolean) => void;
}

/**
 * ResetPasswordForm component - password reset form
 * Uses React Hook Form for state management, Zod for validation, and TanStack Query for API calls
 * Integrates with Supabase Auth to update user password
 * Validates password strength and confirmation
 * Token from URL automatically authenticates the user
 */
export default function ResetPasswordForm({ token: _token, onError, onSuccess }: ResetPasswordFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit: handleReactHookFormSubmit,
    formState: { errors },
    watch,
    setError,
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onBlur",
  });

  const password = watch("password");

  const resetPasswordMutation = useResetPasswordMutation({
    onError: (error) => {
      // Handle specific Supabase errors - set field-level error
      if (error.message.includes("New password should be different")) {
        setError("password", {
          type: "server",
          message: "Nowe hasło musi różnić się od starego hasła.",
        });
      } else {
        // Handle other errors with generic toast
        onError([error.message]);
      }
    },
    onSuccess: () => {
      // Success - show confirmation message
      onSuccess(true);
    },
  });

  const handleSubmit = (data: ResetPasswordInput) => {
    onError([]);
    resetPasswordMutation.mutate(data);
  };

  const passwordError = errors.password;
  const confirmPasswordError = errors.confirmPassword;

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
          disabled={resetPasswordMutation.isPending}
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
          disabled={resetPasswordMutation.isPending}
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
          disabled={resetPasswordMutation.isPending}
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
        disabled={resetPasswordMutation.isPending}
        className="w-full"
        data-testid="reset-password-form-submit-button"
      >
        {resetPasswordMutation.isPending ? "Ustawianie hasła..." : "Ustaw nowe hasło"}
      </Button>
    </form>
  );
}
