import { QueryProvider } from "@/components/QueryProvider";
import ResetPasswordPage from "@/components/ResetPasswordPage";

interface ResetPasswordPageWithProviderProps {
  token: string;
}

/**
 * ResetPasswordPageWithProvider - wraps ResetPasswordPage with QueryProvider
 * Required because ResetPasswordPage uses TanStack Query mutation hooks
 */
export default function ResetPasswordPageWithProvider({ token }: ResetPasswordPageWithProviderProps) {
  return (
    <QueryProvider>
      <ResetPasswordPage token={token} />
    </QueryProvider>
  );
}
