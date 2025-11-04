import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { forgotPassword } from "@/lib/api/auth";
import type { ForgotPasswordInput } from "@/lib/validators/auth.schemas";

/**
 * Hook for forgot password mutation using TanStack Query
 * Sends password reset email through API
 *
 * @param options - Additional mutation options (e.g., onSuccess, onError callbacks)
 * @returns Mutation object with mutate function and loading/error states
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useForgotPasswordMutation(options?: UseMutationOptions<any, Error, ForgotPasswordInput>) {
  return useMutation({
    mutationFn: forgotPassword,
    ...options,
  });
}
