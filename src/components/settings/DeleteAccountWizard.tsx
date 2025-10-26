import { AlertTriangle } from "lucide-react";
import { useState, useCallback, useId } from "react";
import { toast } from "sonner";
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
import { supabaseClient } from "@/db/supabase.client";
import type { DeleteAccountCommand } from "@/types";

interface DeleteAccountWizardProps {
  /** User's email for confirmation validation */
  userEmail: string;
}

/**
 * DeleteAccountWizard component
 * Multi-step account deletion process with email confirmation and checkbox
 * Implements GDPR "right to be forgotten"
 */
export function DeleteAccountWizard({ userEmail }: DeleteAccountWizardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const emailId = useId();
  const confirmCheckboxId = useId();

  // Validate if confirmation email matches user's email
  const isEmailValid = confirmationEmail.trim().toLowerCase() === userEmail.toLowerCase();
  const canSubmit = isEmailValid && isConfirmed && !isDeleting;

  /**
   * Handle email input change
   */
  const handleEmailChange = useCallback((value: string) => {
    setConfirmationEmail(value);
    setEmailError(null); // Clear error on change
  }, []);

  /**
   * Handle account deletion
   */
  const handleDelete = useCallback(async () => {
    // Validate before submission
    if (!isEmailValid) {
      setEmailError("Adres email nie pasuje do Twojego konta");
      return;
    }

    if (!isConfirmed) {
      toast.error("Musisz potwierdzić, że rozumiesz konsekwencje");
      return;
    }

    setIsDeleting(true);

    try {
      // Call DELETE /api/user/account
      const command: DeleteAccountCommand = {
        confirmation_email: confirmationEmail.trim(),
      };

      const response = await fetch("/api/user/account", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
      });

      // Handle rate limiting (429)
      if (response.status === 429) {
        const data = await response.json();
        toast.error(`Za dużo prób. Spróbuj ponownie za ${data.retry_after_seconds} sekund`, {
          duration: 5000,
        });
        setIsDeleting(false);
        return;
      }

      // Handle email mismatch (400)
      if (response.status === 400) {
        const data = await response.json();
        setEmailError(data.message || "Adres email nie pasuje do Twojego konta");
        setIsDeleting(false);
        return;
      }

      // Handle authentication errors (401/403)
      if (response.status === 401 || response.status === 403) {
        toast.error("Sesja wygasła. Zaloguj się ponownie");
        // Wait for toast to be visible
        setTimeout(() => {
          window.location.href = "/login";
        }, 1500);
        return;
      }

      // Handle server errors (5xx)
      if (response.status >= 500) {
        toast.error("Błąd serwera. Spróbuj ponownie później", {
          duration: 5000,
        });
        setIsDeleting(false);
        return;
      }

      // Success (204 No Content)
      if (response.status === 204) {
        // Show success toast
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
      setIsDeleting(false);
    } catch (error) {
      // Network error or exception
      // eslint-disable-next-line no-console
      console.error("Delete account error:", error);
      toast.error("Błąd połączenia. Sprawdź internet i spróbuj ponownie", {
        duration: 5000,
      });
      setIsDeleting(false);
    }
  }, [confirmationEmail, isConfirmed, isEmailValid]);

  /**
   * Reset form when dialog closes
   */
  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Reset form state when closing
      setConfirmationEmail("");
      setIsConfirmed(false);
      setEmailError(null);
      setIsDeleting(false);
    }
  }, []);

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="w-full sm:w-auto hover:bg-red-700 hover:shadow-lg transition-all">
          <AlertTriangle className="mr-2 h-4 w-4" />
          Usuń konto
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-lg bg-gradient-to-b from-glass-bg-from to-glass-bg-to border-glass-border backdrop-blur-xl">
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
              onChange={(e) => handleEmailChange(e.target.value)}
              disabled={isDeleting}
              autoComplete="email"
              aria-required="true"
              aria-invalid={emailError ? "true" : "false"}
              aria-describedby={emailError ? `${emailId}-error` : undefined}
              className={`text-input-text placeholder:text-input-placeholder ${emailError ? "border-destructive" : ""}`}
            />
            {emailError && (
              <p id={`${emailId}-error`} className="text-sm text-destructive" role="alert">
                {emailError}
              </p>
            )}
          </div>

          {/* Confirmation checkbox */}
          <div className="flex items-start space-x-3 rounded-md border border-destructive/50 bg-gradient-to-b from-glass-bg-from to-glass-bg-to backdrop-blur-lg p-3">
            <Checkbox
              id={confirmCheckboxId}
              checked={isConfirmed}
              onCheckedChange={(checked) => setIsConfirmed(checked === true)}
              disabled={isDeleting}
              aria-required="true"
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
          <AlertDialogCancel
            disabled={isDeleting}
            className="border-glass-border bg-gradient-to-b from-glass-bg-from to-glass-bg-to text-glass-text hover-glass"
          >
            Anuluj
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault(); // Prevent default dialog close
              handleDelete();
            }}
            disabled={!canSubmit}
            className="bg-destructive text-white hover:bg-red-700 hover:shadow-lg transition-all"
          >
            {isDeleting ? "Usuwanie..." : "Usuń konto na zawsze"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
