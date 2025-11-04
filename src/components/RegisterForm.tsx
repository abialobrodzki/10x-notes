import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import PasswordStrengthIndicator from "@/components/PasswordStrengthIndicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPendingNote } from "@/lib/utils/pending-note.utils";
import { registerSchema, type RegisterInput } from "@/lib/validators/auth.schemas";

interface RegisterFormProps {
  onError: (errors: string[]) => void;
}

/**
 * RegisterForm component - email/password registration
 * Uses React Hook Form for state management and Zod for validation
 * Integrates with Supabase Auth and handles pending note auto-save flow
 * - Checks sessionStorage for pending notes after successful registration
 * - Redirects to /notes?autoSave=true if pending note exists
 */
export default function RegisterForm({ onError }: RegisterFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [hasSubmitError, setHasSubmitError] = useState(false);

  const {
    register,
    handleSubmit: handleReactHookFormSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: "onBlur",
  });

  const password = watch("password");

  const handleSubmit = async (data: RegisterInput) => {
    onError([]);
    setHasSubmitError(false);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email.trim(),
          password: data.password,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || "Registration failed");
      }

      // Check if email confirmation is required
      if (responseData.requiresConfirmation || !responseData.session) {
        onError([
          responseData.message ||
            "Rejestracja udana! Sprawdź swoją skrzynkę email i kliknij link potwierdzający, aby aktywować konto.",
        ]);
        return;
      }

      // Registration successful with immediate session
      const pendingNote = getPendingNote();

      if (pendingNote) {
        window.location.replace("/notes?autoSave=true");
        return;
      }

      window.location.replace("/notes");
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Registration error:", error);

      setHasSubmitError(true);

      if (error instanceof Error) {
        onError([error.message]);
      } else {
        onError(["Wystąpił nieoczekiwany błąd. Spróbuj ponownie."]);
      }
    }
  };

  const emailError = errors.email || (hasSubmitError ? errors.email : null);
  const passwordError = errors.password || (hasSubmitError ? errors.password : null);
  const confirmPasswordError = errors.confirmPassword || (hasSubmitError ? errors.confirmPassword : null);

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
          disabled={isSubmitting}
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
          disabled={isSubmitting}
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
          disabled={isSubmitting}
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
        data-testid="register-form-submit-button"
      >
        {isSubmitting ? "Rejestracja..." : "Zarejestruj się"}
      </Button>
    </form>
  );
}
