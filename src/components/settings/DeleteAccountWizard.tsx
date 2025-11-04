import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
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
import { supabaseClient } from "@/db/supabase.client";
import { deleteAccountFormSchema, type DeleteAccountFormInput } from "@/lib/validators/user.schemas";

interface DeleteAccountWizardProps {
  /** User's email for confirmation validation */
  userEmail: string;
}

/**
 * DeleteAccountWizard component
 * Multi-step account deletion process with email confirmation and checkbox
 * Uses React Hook Form for state management and Zod for validation
 * Implements GDPR "right to be forgotten"
 */
export function DeleteAccountWizard({ userEmail }: DeleteAccountWizardProps) {
  const [isOpen, setIsOpen] = useState(false);

  const {
    register,
    handleSubmit: handleReactHookFormSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<DeleteAccountFormInput>({
    resolver: zodResolver(deleteAccountFormSchema),
    mode: "onBlur",
    defaultValues: {
      confirmation_email: "",
      isConfirmed: false,
    },
  });

  const isConfirmed = watch("isConfirmed");
  const emailError = errors.confirmation_email;
  const confirmCheckboxError = errors.isConfirmed;

  const handleDelete = async (data: DeleteAccountFormInput) => {
    try {
      // Check if email matches (additional client-side validation)
      if (data.confirmation_email.toLowerCase() !== userEmail.toLowerCase()) {
        toast.error("Adres email nie pasuje do Twojego konta");
        return;
      }

      // Call DELETE /api/user/account
      const response = await fetch("/api/user/account", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          confirmation_email: data.confirmation_email.trim(),
        }),
      });

      // Handle rate limiting (429)
      if (response.status === 429) {
        const responseData = await response.json();
        toast.error(`Za dużo prób. Spróbuj ponownie za ${responseData.retry_after_seconds} sekund`, {
          duration: 5000,
        });
        return;
      }

      // Handle email mismatch (400)
      if (response.status === 400) {
        const responseData = await response.json();
        toast.error(responseData.message || "Adres email nie pasuje do Twojego konta");
        return;
      }

      // Handle authentication errors (401/403)
      if (response.status === 401 || response.status === 403) {
        toast.error("Sesja wygasła. Zaloguj się ponownie");
        setTimeout(() => {
          // eslint-disable-next-line react-compiler/react-compiler
          window.location.href = "/login";
        }, 1500);
        return;
      }

      // Handle server errors (5xx)
      if (response.status >= 500) {
        toast.error("Błąd serwera. Spróbuj ponownie później", {
          duration: 5000,
        });
        return;
      }

      // Success (204 No Content)
      if (response.status === 204) {
        toast.success("Konto zostało usunięte", {
          duration: 3000,
        });

        // Sign out from Supabase
        await supabaseClient.auth.signOut();

        // Wait for toast and signOut to complete, then redirect
        setTimeout(() => {
          window.location.href = "/";
        }, 1500);
        return;
      }

      // Unexpected status
      toast.error("Nieoczekiwany błąd. Spróbuj ponownie");
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Delete account error:", error);
      toast.error("Błąd połączenia. Sprawdź internet i spróbuj ponownie", {
        duration: 5000,
      });
    }
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
              disabled={isSubmitting}
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
            <Checkbox
              disabled={isSubmitting}
              aria-required="true"
              data-testid="delete-account-wizard-confirm-checkbox"
              {...register("isConfirmed")}
            />
            <div className="space-y-1 leading-none">
              <Label className="text-sm font-medium leading-tight cursor-pointer text-glass-text">
                Rozumiem, że ta operacja jest nieodwracalna
              </Label>
              <p className="text-xs text-glass-text-muted">Wszystkie moje dane zostaną trwale usunięte</p>
            </div>
          </div>
          {confirmCheckboxError && (
            <p className="text-sm text-destructive" role="alert">
              {confirmCheckboxError.message}
            </p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" disabled={isSubmitting} data-testid="delete-account-wizard-cancel-button">
                Anuluj
              </Button>
            </AlertDialogCancel>
            <Button
              type="submit"
              variant="destructive-action"
              disabled={!isConfirmed || isSubmitting}
              data-testid="delete-account-wizard-confirm-button"
            >
              {isSubmitting ? "Usuwanie..." : "Usuń konto na zawsze"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
