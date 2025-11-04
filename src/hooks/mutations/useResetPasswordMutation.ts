import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { supabaseClient } from "@/db/supabase.client";
import type { ResetPasswordInput } from "@/lib/validators/auth.schemas";

/**
 * Hook for reset password mutation using TanStack Query
 * Handles password update through Supabase Auth
 *
 * @param options - Additional mutation options (e.g., onSuccess, onError callbacks)
 * @returns Mutation object with mutate function and loading/error states
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useResetPasswordMutation(options?: UseMutationOptions<any, Error, ResetPasswordInput>) {
  return useMutation({
    mutationFn: async (data: ResetPasswordInput) => {
      const { error } = await supabaseClient.auth.updateUser({
        password: data.password,
      });

      if (error) {
        throw error;
      }

      return { success: true };
    },
    ...options,
  });
}
