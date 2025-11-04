import { useCallback, useState } from "react";
import { toast } from "sonner";
import { supabaseClient } from "@/db/supabase.client";
import type { DeleteAccountCommand } from "@/types";

interface UseDeleteAccountReturn {
  isOpen: boolean;
  confirmationEmail: string;
  isConfirmed: boolean;
  setIsConfirmed: (confirmed: boolean) => void;
  isDeleting: boolean;
  emailError: string | null;
  canSubmit: boolean;
  handleEmailChange: (value: string) => void;
  handleDelete: () => Promise<void>;
  handleOpenChange: (open: boolean) => void;
}

/**
 * Hook to manage account deletion state and logic
 */
export function useDeleteAccount(userEmail: string): UseDeleteAccountReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

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

  return {
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
  };
}
