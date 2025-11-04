import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addRecipientSchema, type AddRecipientInput } from "@/lib/validators/tags.schemas";

interface AddRecipientFormProps {
  /** Whether add operation is in progress */
  isAdding: boolean;
  /** Callback when new recipient should be added */
  onAdd: (email: string) => Promise<boolean>;
}

/**
 * AddRecipientForm - Form for adding new recipient by email
 * Uses React Hook Form for state management and Zod for validation
 *
 * Features:
 * - Email input with validation
 * - Loading state during submission
 * - Success/error toast notifications
 * - Form reset after successful submission
 */
export function AddRecipientForm({ isAdding, onAdd }: AddRecipientFormProps) {
  const {
    register,
    handleSubmit: handleReactHookFormSubmit,
    formState: { errors },
    reset,
  } = useForm<AddRecipientInput>({
    resolver: zodResolver(addRecipientSchema),
    mode: "onBlur",
  });

  const handleSubmit = async (data: AddRecipientInput) => {
    const trimmedEmail = data.email.trim();
    const success = await onAdd(trimmedEmail);

    if (success) {
      toast.success("Dodano dostęp", {
        description: `Użytkownik ${trimmedEmail} ma teraz dostęp do tej etykiety`,
      });
      reset();
    } else {
      toast.error("Nie udało się dodać dostępu", {
        description: "Sprawdź czy użytkownik istnieje i ma potwierdzony email",
      });
    }
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
              disabled={isAdding}
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
            disabled={isAdding}
            size="default"
            aria-label="Dodaj użytkownika"
            data-testid="add-recipient-form-submit-button"
          >
            {isAdding ? (
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
