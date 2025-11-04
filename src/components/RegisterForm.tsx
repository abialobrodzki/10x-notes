import { useId } from "react";
import { useRegistrationForm } from "@/components/hooks/useRegistrationForm";
import PasswordStrengthIndicator from "@/components/PasswordStrengthIndicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RegisterFormProps {
  onError: (errors: string[]) => void;
}

/**
 * RegisterForm component - email/password registration
 * Integrates with Supabase Auth and handles pending note auto-save flow
 * - Checks sessionStorage for pending notes after successful registration
 * - Redirects to /notes?autoSave=true if pending note exists
 */
export default function RegisterForm({ onError }: RegisterFormProps) {
  const {
    email,
    password,
    confirmPassword,
    showPassword,
    isSubmitting,
    hasSubmitError,
    emailHasError,
    passwordHasError,
    confirmPasswordHasError,
    setEmail,
    setPassword,
    setConfirmPassword,
    setShowPassword,
    setHasSubmitError,
    handleBlur,
    handleSubmit,
  } = useRegistrationForm({ onError });

  const emailId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();
  const showPasswordId = useId();

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate data-testid="register-form">
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
          data-testid="register-form-email-input"
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
          placeholder="Co najmniej 8 znaków"
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
          data-testid="register-form-password-input"
        />
        {/* Password strength indicator */}
        <PasswordStrengthIndicator password={password} />
      </div>

      {/* Confirm Password input */}
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
          data-testid="register-form-confirm-password-input"
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
        data-testid="register-form-submit-button"
      >
        {isSubmitting ? "Rejestracja..." : "Zarejestruj się"}
      </Button>
    </form>
  );
}
