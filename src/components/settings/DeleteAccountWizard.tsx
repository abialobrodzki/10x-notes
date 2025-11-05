import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDeleteAccountMutation } from "@/hooks/mutations/useDeleteAccountMutation";
import { deleteAccountFormSchema, type DeleteAccountFormInput } from "@/lib/validators/user.schemas";

interface DeleteAccountWizardProps {
  /** User's email for confirmation validation */
  userEmail: string;
}

/**
 * DeleteAccountWizard component
 * Multi-step account deletion process with email confirmation and checkbox
 * Uses React Hook Form for state management, Zod for validation, and TanStack Query for API calls
 * Implements GDPR "right to be forgotten"
 */
export function DeleteAccountWizard({ userEmail }: DeleteAccountWizardProps) {
  const [isOpen, setIsOpen] = useState(false);

  const {
    register,
    control,
    handleSubmit: handleReactHookFormSubmit,
    formState: { errors },
    watch,
    setError,
  } = useForm<DeleteAccountFormInput>({
    resolver: zodResolver(deleteAccountFormSchema),
    mode: "onBlur",
    defaultValues: {
      confirmation_email: "",
      isConfirmed: false,
    },
  });

  const isConfirmed = watch("isConfirmed") ?? false;
  const confirmationEmail = watch("confirmation_email") ?? "";
  const normalizedUserEmail = userEmail.trim().toLowerCase();
  const normalizedConfirmationEmail = confirmationEmail.trim().toLowerCase();
  const isEmailMatchingUser =
    normalizedConfirmationEmail.length > 0 && normalizedConfirmationEmail === normalizedUserEmail;
  const emailError = errors.confirmation_email;
  const confirmCheckboxError = errors.isConfirmed;

  const deleteAccountMutation = useDeleteAccountMutation({
    onError: (error) => {
      // Handle email mismatch (400) - set field-level error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((error as any).status === 400) {
        setError("confirmation_email", {
          type: "server",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          message: (error as any).message || "Adres email nie pasuje do Twojego konta.",
        });
      }
    },
  });

  const handleDelete = (data: DeleteAccountFormInput) => {
    // Check if email matches (additional client-side validation)
    if (data.confirmation_email.toLowerCase() !== userEmail.toLowerCase()) {
      setError("confirmation_email", {
        type: "server",
        message: "Adres email nie pasuje do Twojego konta.",
      });
      return;
    }

    deleteAccountMutation.mutate({
      confirmation_email: data.confirmation_email.trim(),
      isConfirmed: data.isConfirmed,
    });
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          className="w-full sm:w-auto hover-destructive-action transition-all"
          data-testid="delete-account-wizard-trigger"
        >
          <AlertTriangle className="mr-2 h-4 w-4" />
          Usuń konto
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        className="max-w-lg bg-linear-to-b from-glass-bg-from to-glass-bg-to border-glass-border backdrop-blur-xl"
        data-testid="delete-account-wizard-dialog"
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive outline-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            <AlertTriangle className="h-5 w-5" />
            Usuń konto na zawsze
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 pt-2 text-left text-glass-text-muted">
            <p className="font-semibold text-glass-text">Ta operacja jest nieodwracalna!</p>
            <p>Usunięcie konta spowoduje trwałe usunięcie:</p>
            <ul className="list-inside list-disc space-y-1 text-sm">
              <li>Wszystkich Twoich notatek</li>
              <li>Wszystkich Twoich etykiet</li>
              <li>Wszystkich udostępnień i linków publicznych</li>
              <li>Całej historii generacji AI</li>
              <li>Danych konta użytkownika</li>
            </ul>
            <p className="text-sm font-medium text-glass-text">
              Dane zostaną usunięte zgodnie z RODO i nie będzie możliwości ich odzyskania.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Confirmation form */}
        <form onSubmit={handleReactHookFormSubmit(handleDelete)} className="space-y-4 pt-4">
          {/* Email confirmation input */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-glass-text">
              Potwierdź adres email: <span className="font-mono text-xs text-glass-text-muted">{userEmail}</span>
            </Label>
            <Input
              type="email"
              placeholder="Wpisz swój email"
              disabled={deleteAccountMutation.isPending}
              autoComplete="email"
              aria-required="true"
              aria-invalid={!!emailError}
              aria-describedby={emailError ? "email-error" : undefined}
              className={`text-input-text placeholder:text-input-placeholder ${emailError ? "border-destructive" : ""}`}
              data-testid="delete-account-wizard-email-input"
              {...register("confirmation_email")}
            />
            {emailError && (
              <p
                id="email-error"
                className="text-sm text-destructive"
                role="alert"
                data-testid="delete-account-wizard-email-error"
              >
                {emailError.message}
              </p>
            )}
          </div>

          {/* Confirmation checkbox */}
          <div className="flex items-start space-x-3 rounded-md border border-destructive/50 bg-linear-to-b from-glass-bg-from to-glass-bg-to backdrop-blur-lg p-3">
            <Controller
              control={control}
              name="isConfirmed"
              render={({ field }) => (
                <Checkbox
                  disabled={deleteAccountMutation.isPending}
                  aria-required="true"
                  data-testid="delete-account-wizard-confirm-checkbox"
                  checked={!!field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                  onBlur={field.onBlur}
                />
              )}
            />
            <div className="space-y-1 leading-none">
              <Label className="text-sm font-medium leading-tight cursor-pointer text-glass-text">
                Rozumiem, że ta operacja jest nieodwracalna
              </Label>
              <p className="text-xs text-glass-text-muted">Wszystkie moje dane zostaną trwale usunięte</p>
            </div>
          </div>
          {confirmCheckboxError && (
            <p
              id="confirmed-error"
              className="text-sm text-destructive"
              role="alert"
              data-testid="delete-account-wizard-confirm-error"
            >
              {confirmCheckboxError.message}
            </p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button
                variant="outline"
                disabled={deleteAccountMutation.isPending}
                data-testid="delete-account-wizard-cancel-button"
              >
                Anuluj
              </Button>
            </AlertDialogCancel>
            <Button
              type="submit"
              variant="destructive-action"
              disabled={!isConfirmed || !isEmailMatchingUser || deleteAccountMutation.isPending}
              data-testid="delete-account-wizard-confirm-button"
            >
              {deleteAccountMutation.isPending ? "Usuwanie..." : "Usuń konto na zawsze"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
