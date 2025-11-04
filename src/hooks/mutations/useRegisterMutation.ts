import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { register } from "@/lib/api/auth";
import { getPendingNote } from "@/lib/utils/pending-note.utils";
import type { RegisterInput } from "@/lib/validators/auth.schemas";

/**
 * Hook for registration mutation using TanStack Query
 * Handles API communication and redirect logic after successful registration
 *
 * @param options - Additional mutation options (e.g., onError, onSuccess callbacks)
 * @returns Mutation object with mutate function and loading/error states
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useRegisterMutation(options?: UseMutationOptions<any, Error, RegisterInput>) {
  return useMutation({
    mutationFn: register,
    onSuccess: (data) => {
      // Check if email confirmation is required
      if (data.requiresConfirmation || !data.session) {
        // Don't redirect - let component handle confirmation message
        return;
      }

      // Registration successful with immediate session
      // Check for pending generated note
      const pendingNote = getPendingNote();

      if (pendingNote) {
        // Replace current history entry to prevent going back to register page
        window.location.replace("/notes?autoSave=true");
      } else {
        // No pending note - redirect to notes
        window.location.replace("/notes");
      }
    },
    ...options,
  });
}
