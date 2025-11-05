import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import PasswordStrengthIndicator from "@/components/PasswordStrengthIndicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRegisterMutation } from "@/hooks/mutations/useRegisterMutation";
import { registerSchema, type RegisterInput } from "@/lib/validators/auth.schemas";

interface RegisterFormProps {
  onError: (errors: string[]) => void;
  onSuccess?: (messages: string[]) => void;
}

/**
 * RegisterForm component - email/password registration
 * Uses React Hook Form for state management, Zod for validation, and TanStack Query for API calls
 * Integrates with Supabase Auth and handles pending note auto-save flow
 * - Checks sessionStorage for pending notes after successful registration
 * - Redirects to /notes?autoSave=true if pending note exists
 */
export default function RegisterForm({ onError, onSuccess }: RegisterFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit: handleReactHookFormSubmit,
    formState: { errors },
    watch,
    setError,
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: "onBlur",
  });

  const password = watch("password");

  const registerMutation = useRegisterMutation({
    onError: (error) => {
      // Handle email already exists error (409 Conflict)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((error as any).status === 409) {
        setError("email", {
          type: "server",
          message: "Użytkownik o tym adresie email już istnieje.",
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } else if ((error as any).status !== 0) {
        // Handle other API errors with generic toast (skip if status is 0, handled in mutation)
        onError([error.message || "Rejestracja nie powiodła się. Spróbuj ponownie."]);
      }
    },
    onSuccess: (data) => {
      // Check if email confirmation is required
      if (data.requiresConfirmation || !data.session) {
        onSuccess?.([
          data.message ||
            "Rejestracja udana! Sprawdź swoją skrzynkę email i kliknij link potwierdzający, aby aktywować konto.",
        ]);
      }
    },
  });

  const handleSubmit = (data: RegisterInput) => {
    onError([]);
    onSuccess?.([]);
    registerMutation.mutate(data);
  };

  const emailError = errors.email;
  const passwordError = errors.password;
  const confirmPasswordError = errors.confirmPassword;

  return (
    <form
      onSubmit={handleReactHookFormSubmit(handleSubmit)}
      className="space-y-4"
      noValidate
      data-testid="register-form"
    >
      {/* Email input */}
      <div className="space-y-2">
        <Label className="text-glass-text">Email</Label>
        <Input
          type="email"
          placeholder="twoj@email.com"
          disabled={registerMutation.isPending}
          autoComplete="email"
          aria-required="true"
          aria-invalid={!!emailError}
          className="border-input-border bg-input-bg text-input-text placeholder:text-input-placeholder"
          data-testid="register-form-email-input"
          {...register("email")}
        />
        {emailError && <p className="text-sm text-destructive">{emailError.message}</p>}
      </div>

      {/* Password input */}
      <div className="space-y-2">
        <Label className="text-glass-text">Hasło</Label>
        <Input
          type={showPassword ? "text" : "password"}
          placeholder="Co najmniej 8 znaków"
          disabled={registerMutation.isPending}
          autoComplete="new-password"
          aria-required="true"
          aria-invalid={!!passwordError}
          className="border-input-border bg-input-bg text-input-text placeholder:text-input-placeholder"
          data-testid="register-form-password-input"
          {...register("password")}
        />
        {passwordError && <p className="text-sm text-destructive">{passwordError.message}</p>}
        {/* Password strength indicator */}
        <PasswordStrengthIndicator password={password} />
      </div>

      {/* Confirm Password input */}
      <div className="space-y-2">
        <Label className="text-glass-text">Potwierdź hasło</Label>
        <Input
          type={showPassword ? "text" : "password"}
          placeholder="Powtórz hasło"
          disabled={registerMutation.isPending}
          autoComplete="new-password"
          aria-required="true"
          aria-invalid={!!confirmPasswordError}
          className="border-input-border bg-input-bg text-input-text placeholder:text-input-placeholder"
          data-testid="register-form-confirm-password-input"
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
          disabled={registerMutation.isPending}
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
        disabled={registerMutation.isPending}
        className="w-full"
        data-testid="register-form-submit-button"
      >
        {registerMutation.isPending ? "Rejestracja..." : "Zarejestruj się"}
      </Button>
    </form>
  );
}
