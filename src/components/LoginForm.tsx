import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPendingNote } from "@/lib/utils/pending-note.utils";
import { loginSchema, type LoginInput } from "@/lib/validators/auth.schemas";

interface LoginFormProps {
  onError: (errors: string[]) => void;
}

/**
 * LoginForm component - email/password authentication
 * Uses React Hook Form for state management and Zod for validation
 * Integrates with Supabase Auth and handles pending note auto-save flow
 * - Checks sessionStorage for pending notes after successful login
 * - Redirects to /notes?autoSave=true if pending note exists
 */
export default function LoginForm({ onError }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [hasSubmitError, setHasSubmitError] = useState(false);

  const {
    register,
    handleSubmit: handleReactHookFormSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
  });

  const handleSubmit = async (data: LoginInput) => {
    onError([]);
    setHasSubmitError(false);

    try {
      const response = await fetch("/api/auth/login", {
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
        throw new Error(responseData.message || "Authentication failed");
      }

      // Login successful - check for pending note
      const pendingNote = getPendingNote();

      if (pendingNote) {
        window.location.replace("/notes?autoSave=true");
        return;
      }

      window.location.replace("/notes");
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Login error:", error);

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

  return (
    <form onSubmit={handleReactHookFormSubmit(handleSubmit)} className="space-y-4" noValidate data-testid="login-form">
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
          data-testid="login-form-email-input"
          {...register("email")}
        />
        {emailError && <p className="text-sm text-destructive">{emailError.message}</p>}
      </div>

      {/* Password input */}
      <div className="space-y-2">
        <Label className="text-glass-text">Hasło</Label>
        <Input
          type={showPassword ? "text" : "password"}
          placeholder="Twoje hasło"
          disabled={isSubmitting}
          autoComplete="current-password"
          aria-required="true"
          aria-invalid={!!passwordError}
          className="border-input-border bg-input-bg text-input-text placeholder:text-input-placeholder"
          data-testid="login-form-password-input"
          {...register("password")}
        />
        {passwordError && <p className="text-sm text-destructive">{passwordError.message}</p>}
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
        data-testid="login-form-submit-button"
      >
        {isSubmitting ? "Logowanie..." : "Zaloguj się"}
      </Button>
    </form>
  );
}
