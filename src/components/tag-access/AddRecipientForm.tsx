import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAddRecipientMutation } from "@/hooks/mutations/useAddRecipientMutation";
import { addRecipientSchema, type AddRecipientInput } from "@/lib/validators/tags.schemas";

interface AddRecipientFormProps {
  /** Tag ID to add recipient to */
  tagId: string;
}

/**
 * AddRecipientForm - Form for adding new recipient by email
 * Uses React Hook Form for state management, Zod for validation, and TanStack Query for API calls
 *
 * Features:
 * - Email input with validation
 * - Loading state during submission
 * - Success/error toast notifications
 * - Form reset after successful submission
 */
export function AddRecipientForm({ tagId }: AddRecipientFormProps) {
  const {
    register,
    handleSubmit: handleReactHookFormSubmit,
    formState: { errors },
    reset,
    setError,
  } = useForm<AddRecipientInput>({
    resolver: zodResolver(addRecipientSchema),
    mode: "onBlur",
  });

  const addRecipientMutation = useAddRecipientMutation({
    onError: (error) => {
      // Set field-level error for user feedback
      // The mutation hook maps HTTP status codes to friendly error messages

      setError("email", {
        type: "server",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        message: (error as any).message || "Użytkownik nie istnieje, ma już dostęp, lub email nie został potwierdzony.",
      });
    },
    onSuccess: () => {
      reset();
    },
  });

  const handleSubmit = (data: AddRecipientInput) => {
    addRecipientMutation.mutate({
      tagId,
      email: data.email.trim(),
    });
  };

  const emailError = errors.email;

  return (
    <form onSubmit={handleReactHookFormSubmit(handleSubmit)} className="space-y-4" data-testid="add-recipient-form">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Dodaj nowego użytkownika</Label>
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              type="email"
              placeholder="email@example.com"
              disabled={addRecipientMutation.isPending}
              aria-invalid={!!emailError}
              aria-describedby={emailError ? "email-error" : undefined}
              className={emailError ? "border-input-border-error" : ""}
              data-testid="add-recipient-form-email-input"
              {...register("email")}
            />
            {emailError && (
              <p
                id="email-error"
                className="mt-1 text-xs text-destructive"
                role="alert"
                data-testid="add-recipient-form-validation-error"
              >
                {emailError.message}
              </p>
            )}
          </div>
          <Button
            type="submit"
            disabled={addRecipientMutation.isPending}
            size="default"
            aria-label="Dodaj użytkownika"
            data-testid="add-recipient-form-submit-button"
          >
            {addRecipientMutation.isPending ? (
              <>Dodawanie...</>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Dodaj
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Wprowadź email zarejestrowanego użytkownika, aby nadać mu dostęp tylko do odczytu
        </p>
      </div>
    </form>
  );
}
