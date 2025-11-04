import { AlertTriangle } from "lucide-react";
import { useId } from "react";
import { useDeleteAccount } from "@/components/hooks/useDeleteAccount";
import {
  AlertDialog,
  AlertDialogAction,
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

interface DeleteAccountWizardProps {
  /** User's email for confirmation validation */
  userEmail: string;
}

/**
 * DeleteAccountWizard component
 * Multi-step account deletion process with email confirmation and checkbox
 * Implements GDPR "right to be forgotten"
 * Presentational component using useDeleteAccount hook
 */
export function DeleteAccountWizard({ userEmail }: DeleteAccountWizardProps) {
  const {
    isOpen,
    confirmationEmail,
    isConfirmed,
    setIsConfirmed,
    isDeleting,
    emailError,
    canSubmit,
    handleEmailChange,
    handleDelete,
    handleOpenChange,
  } = useDeleteAccount(userEmail);

  const emailId = useId();
  const confirmCheckboxId = useId();

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
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
        <div className="space-y-4 pt-4">
          {/* Email confirmation input */}
          <div className="space-y-2">
            <Label htmlFor={emailId} className="text-sm font-medium text-glass-text">
              Potwierdź adres email: <span className="font-mono text-xs text-glass-text-muted">{userEmail}</span>
            </Label>
            <Input
              id={emailId}
              type="email"
              placeholder="Wpisz swój email"
              value={confirmationEmail}
              onChange={(e) => handleEmailChange(e.currentTarget.value)}
              disabled={isDeleting}
              autoComplete="email"
              aria-required="true"
              aria-invalid={emailError ? "true" : "false"}
              aria-describedby={emailError ? `${emailId}-error` : undefined}
              className={`text-input-text placeholder:text-input-placeholder ${emailError ? "border-destructive" : ""}`}
              data-testid="delete-account-wizard-email-input"
            />
            {emailError && (
              <p
                id={`${emailId}-error`}
                className="text-sm text-destructive"
                role="alert"
                data-testid="delete-account-wizard-email-error"
              >
                {emailError}
              </p>
            )}
          </div>

          {/* Confirmation checkbox */}
          <div className="flex items-start space-x-3 rounded-md border border-destructive/50 bg-linear-to-b from-glass-bg-from to-glass-bg-to backdrop-blur-lg p-3">
            <Checkbox
              id={confirmCheckboxId}
              checked={isConfirmed}
              onCheckedChange={(checked) => setIsConfirmed(checked === true)}
              disabled={isDeleting}
              aria-required="true"
              data-testid="delete-account-wizard-confirm-checkbox"
            />
            <div className="space-y-1 leading-none">
              <Label
                htmlFor={confirmCheckboxId}
                className="text-sm font-medium leading-tight cursor-pointer text-glass-text"
              >
                Rozumiem, że ta operacja jest nieodwracalna
              </Label>
              <p className="text-xs text-glass-text-muted">Wszystkie moje dane zostaną trwale usunięte</p>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" disabled={isDeleting} data-testid="delete-account-wizard-cancel-button">
              Anuluj
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant="destructive-action"
              disabled={!canSubmit}
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.preventDefault(); // Prevent default dialog close
                handleDelete();
              }}
              data-testid="delete-account-wizard-confirm-button"
            >
              {isDeleting ? "Usuwanie..." : "Usuń konto na zawsze"}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
