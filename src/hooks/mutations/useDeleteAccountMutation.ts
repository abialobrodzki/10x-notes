import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabaseClient } from "@/db/supabase.client";
import type { DeleteAccountFormInput } from "@/lib/validators/user.schemas";

/**
 * Hook for delete account mutation using TanStack Query
 * Handles account deletion with confirmation and sign out logic
 *
 * @param options - Additional mutation options (e.g., onError callbacks)
 * @returns Mutation object with mutate function and loading/error states
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDeleteAccountMutation(options?: UseMutationOptions<any, Error, DeleteAccountFormInput>) {
  return useMutation({
    mutationFn: async (data: DeleteAccountFormInput) => {
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
        const error = new Error(`Za dużo prób. Spróbuj ponownie za ${responseData.retry_after_seconds} sekund`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error as any).status = 429;
        throw error;
      }

      // Handle email mismatch (400)
      if (response.status === 400) {
        const responseData = await response.json();
        const error = new Error(responseData.message || "Adres email nie pasuje do Twojego konta.");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error as any).status = 400;
        throw error;
      }

      // Handle authentication errors (401/403)
      if (response.status === 401 || response.status === 403) {
        const error = new Error("Sesja wygasła. Zaloguj się ponownie");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error as any).status = response.status;
        throw error;
      }

      // Handle server errors (5xx)
      if (response.status >= 500) {
        const error = new Error("Błąd serwera. Spróbuj ponownie później");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error as any).status = response.status;
        throw error;
      }

      // Success (204 No Content)
      if (response.status === 204) {
        return { success: true };
      }

      // Unexpected status
      throw new Error("Nieoczekiwany błąd. Spróbuj ponownie");
    },
    onSuccess: async () => {
      toast.success("Konto zostało usunięte", {
        duration: 3000,
      });

      // Sign out from Supabase
      await supabaseClient.auth.signOut();

      // Wait for toast and signOut to complete, then redirect
      setTimeout(() => {
        // eslint-disable-next-line react-compiler/react-compiler
        window.location.href = "/";
      }, 1500);
    },
    ...options,
  });
}
