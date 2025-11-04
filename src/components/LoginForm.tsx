import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLoginMutation } from "@/hooks/mutations/useLoginMutation";
import { loginSchema, type LoginInput } from "@/lib/validators/auth.schemas";

interface LoginFormProps {
  onError: (errors: string[]) => void;
}

/**
 * LoginForm component - email/password authentication
 * Uses React Hook Form for state management, Zod for validation, and TanStack Query for API calls
 * Integrates with Supabase Auth and handles pending note auto-save flow
 * - Checks sessionStorage for pending notes after successful login
 * - Redirects to /notes?autoSave=true if pending note exists
 */
export default function LoginForm({ onError }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit: handleReactHookFormSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
  });

  const loginMutation = useLoginMutation({
    onError: (error) => {
      // Handle specific error types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((error as any).status === 401) {
        setError("email", {
          type: "server",
          message: "Nieprawidłowy email lub hasło.",
        });
      } else {
        // Generic error handling
        onError([error.message || "Wystąpił nieoczekiwany błąd. Spróbuj ponownie."]);
      }
    },
  });

  const handleSubmit = (data: LoginInput) => {
    onError([]);
    loginMutation.mutate(data);
  };

  const emailError = errors.email;
  const passwordError = errors.password;

  return (
    <form onSubmit={handleReactHookFormSubmit(handleSubmit)} className="space-y-4" noValidate data-testid="login-form">
      {/* Email input */}
      <div className="space-y-2">
        <Label className="text-glass-text">Email</Label>
        <Input
          type="email"
          placeholder="twoj@email.com"
          disabled={loginMutation.isPending}
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
          disabled={loginMutation.isPending}
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
          disabled={loginMutation.isPending}
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
        disabled={loginMutation.isPending}
        className="w-full"
        data-testid="login-form-submit-button"
      >
        {loginMutation.isPending ? "Logowanie..." : "Zaloguj się"}
      </Button>
    </form>
  );
}
