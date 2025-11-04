import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import type { UUID } from "@/types";

interface AddRecipientData {
  tagId: UUID;
  email: string;
}

/**
 * Hook for adding recipient mutation using TanStack Query
 * Handles API communication for adding tag access recipients
 *
 * @param options - Additional mutation options (e.g., onSuccess, onError callbacks)
 * @returns Mutation object with mutate function and loading/error states
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useAddRecipientMutation(options?: UseMutationOptions<any, Error, AddRecipientData>) {
  return useMutation({
    mutationFn: async (data: AddRecipientData) => {
      const response = await fetch(`/api/tags/${data.tagId}/access`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recipient_email: data.email }),
      });

      if (!response.ok) {
        let errorMessage = "Nie udało się dodać dostępu";

        if (response.status === 400) {
          errorMessage = "Użytkownik nie istnieje lub email nie został potwierdzony";
        } else if (response.status === 409) {
          errorMessage = "Użytkownik ma już dostęp do tej etykiety";
        } else if (response.status === 401 || response.status === 403) {
          errorMessage = "Brak uprawnień do zarządzania dostępem";
        }

        const error = new Error(errorMessage);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error as any).status = response.status;
        throw error;
      }

      return response.json();
    },
    ...options,
  });
}
