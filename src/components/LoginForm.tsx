import { useId } from "react";
import { useLoginForm } from "@/components/hooks/useLoginForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LoginFormProps {
  onError: (errors: string[]) => void;
}

/**
 * LoginForm component - email/password authentication
 * Integrates with Supabase Auth and handles pending note auto-save flow
 * - Checks sessionStorage for pending notes after successful login
 * - Redirects to /notes?autoSave=true if pending note exists
 */
export default function LoginForm({ onError }: LoginFormProps) {
  const {
    email,
    password,
    showPassword,
    isSubmitting,
    hasSubmitError,
    emailHasError,
    passwordHasError,
    setEmail,
    setPassword,
    setShowPassword,
    setHasSubmitError,
    handleBlur,
    handleSubmit,
  } = useLoginForm({ onError });

  const emailId = useId();
  const passwordId = useId();
  const showPasswordId = useId();

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate data-testid="login-form">
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
          onBlur={() => handleBlur("email")}
          disabled={isSubmitting}
          autoComplete="email"
          required
          aria-required="true"
          aria-invalid={emailHasError ? "true" : "false"}
          className="border-input-border bg-input-bg text-input-text placeholder:text-input-placeholder"
          data-testid="login-form-email-input"
        />
      </div>

      {/* Password input */}
      <div className="space-y-2">
        <Label htmlFor={passwordId} className="text-glass-text">
          Hasło
        </Label>
        <Input
          id={passwordId}
          type={showPassword ? "text" : "password"}
          placeholder="Twoje hasło"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (hasSubmitError) setHasSubmitError(false);
          }}
          onBlur={() => handleBlur("password")}
          disabled={isSubmitting}
          autoComplete="current-password"
          required
          aria-required="true"
          aria-invalid={passwordHasError ? "true" : "false"}
          className="border-input-border bg-input-bg text-input-text placeholder:text-input-placeholder"
          data-testid="login-form-password-input"
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
        data-testid="login-form-submit-button"
      >
        {isSubmitting ? "Logowanie..." : "Zaloguj się"}
      </Button>
    </form>
  );
}
