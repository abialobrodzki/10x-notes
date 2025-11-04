import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForgotPasswordMutation } from "@/hooks/mutations/useForgotPasswordMutation";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validators/auth.schemas";

interface ForgotPasswordFormProps {
  onError: (errors: string[]) => void;
  onSuccess: (success: boolean) => void;
}

/**
 * ForgotPasswordForm component - password reset request form
 * Uses React Hook Form for state management, Zod for validation, and TanStack Query for API calls
 * Integrates with Supabase Auth to send password reset email
 * Validates email and handles submission flow
 */
export default function ForgotPasswordForm({ onError, onSuccess }: ForgotPasswordFormProps) {
  const {
    register,
    handleSubmit: handleReactHookFormSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onBlur",
  });

  const forgotPasswordMutation = useForgotPasswordMutation({
    onError: (error) => {
      onError([error.message]);
    },
    onSuccess: () => {
      // Success - show confirmation message
      // Note: For security, we don't reveal if email exists
      onSuccess(true);
    },
  });

  const handleSubmit = (data: ForgotPasswordInput) => {
    onError([]);
    forgotPasswordMutation.mutate(data);
  };

  const emailError = errors.email;

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
          disabled={forgotPasswordMutation.isPending}
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
        disabled={forgotPasswordMutation.isPending}
        className="w-full"
        data-testid="forgot-password-form-submit-button"
      >
        {forgotPasswordMutation.isPending ? "Wysyłanie..." : "Wyślij link resetujący"}
      </Button>
    </form>
  );
}
