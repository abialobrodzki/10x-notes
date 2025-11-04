import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { login } from "@/lib/api/auth";
import { getPendingNote } from "@/lib/utils/pending-note.utils";
import type { LoginInput } from "@/lib/validators/auth.schemas";

/**
 * Hook for login mutation using TanStack Query
 * Handles API communication and redirect logic after successful login
 *
 * @param options - Additional mutation options (e.g., onError, onSuccess callbacks)
 * @returns Mutation object with mutate function and loading/error states
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useLoginMutation(options?: UseMutationOptions<any, Error, LoginInput>) {
  return useMutation({
    mutationFn: login,
    onSuccess: () => {
      // Login successful - check for pending note
      const pendingNote = getPendingNote();

      if (pendingNote) {
        // Replace current history entry to prevent going back to login page
        window.location.replace("/notes?autoSave=true");
      } else {
        // No pending note - redirect to notes
        window.location.replace("/notes");
      }
    },
    ...options,
  });
}
