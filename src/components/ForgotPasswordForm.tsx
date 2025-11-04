import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validators/auth.schemas";

interface ForgotPasswordFormProps {
  onError: (errors: string[]) => void;
  onSuccess: (success: boolean) => void;
}

/**
 * ForgotPasswordForm component - password reset request form
 * Uses React Hook Form for state management and Zod for validation
 * Integrates with Supabase Auth to send password reset email
 * Validates email and handles submission flow
 */
export default function ForgotPasswordForm({ onError, onSuccess }: ForgotPasswordFormProps) {
  const [hasSubmitError, setHasSubmitError] = useState(false);

  const {
    register,
    handleSubmit: handleReactHookFormSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onBlur",
  });

  const handleSubmit = async (data: ForgotPasswordInput) => {
    onError([]);
    setHasSubmitError(false);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email.trim(),
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || "Password reset request failed");
      }

      // Success - show confirmation message
      // Note: For security, we don't reveal if email exists
      onSuccess(true);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Password reset request error:", error);

      setHasSubmitError(true);

      if (error instanceof Error) {
        onError([error.message]);
      } else {
        onError(["Wystąpił nieoczekiwany błąd. Spróbuj ponownie."]);
      }
    }
  };

  const emailError = errors.email || (hasSubmitError ? errors.email : null);

  return (
    <form
      onSubmit={handleReactHookFormSubmit(handleSubmit)}
      className="space-y-4"
      noValidate
      data-testid="forgot-password-form"
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
          data-testid="forgot-password-form-email-input"
          {...register("email")}
        />
        {emailError && <p className="text-sm text-destructive">{emailError.message}</p>}
      </div>

      {/* Submit button */}
      <Button
        type="submit"
        variant="gradient"
        disabled={isSubmitting}
        className="w-full"
        data-testid="forgot-password-form-submit-button"
      >
        {isSubmitting ? "Wysyłanie..." : "Wyślij link resetujący"}
      </Button>
    </form>
  );
}
