import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import type { UUID } from "@/types";

interface AddRecipientData {
  tagId: UUID;
  email: string;
}

interface ApiError extends Error {
  status: number;
}

/**
 * Hook for adding recipient mutation using TanStack Query
 * Handles API communication for adding tag access recipients
 *
 * @param options - Additional mutation options (e.g., onSuccess, onError callbacks)
 * @returns Mutation object with mutate function and loading/error states
 */
export function useAddRecipientMutation(options?: UseMutationOptions<unknown, ApiError, AddRecipientData>) {
  return useMutation({
    mutationFn: async (data: AddRecipientData) => {
      const response = await fetch(`/api/tags/${data.tagId}/access`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recipient_email: data.email }),
      });

      // Try to parse response as JSON, but handle HTML error pages
      let responseData: unknown;
      const contentType = response.headers.get("content-type");

      try {
        if (contentType?.includes("application/json")) {
          responseData = await response.json();
        } else {
          responseData = await response.text();
        }
      } catch {
        responseData = null;
      }

      if (!response.ok) {
        let errorMessage = "Nie udało się dodać dostępu";

        if (response.status === 400) {
          errorMessage = "Użytkownik nie istnieje lub email nie został potwierdzony";
        } else if (response.status === 404) {
          errorMessage = "Użytkownik nie istnieje";
        } else if (response.status === 409) {
          errorMessage = "Użytkownik ma już dostęp do tej etykiety";
        } else if (response.status === 401 || response.status === 403) {
          errorMessage = "Brak uprawnień do zarządzania dostępem";
        } else if (response.status >= 500) {
          errorMessage = "Błąd serwera - spróbuj ponownie";
        }

        const error = new Error(errorMessage) as ApiError;
        error.status = response.status;
        throw error;
      }

      return responseData;
    },
    ...options,
  });
}
