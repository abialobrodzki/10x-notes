import ForgotPasswordPage from "@/components/ForgotPasswordPage";
import { QueryProvider } from "@/components/QueryProvider";

/**
 * ForgotPasswordPageWithProvider - wraps ForgotPasswordPage with QueryProvider
 * Required because ForgotPasswordPage uses TanStack Query mutation hooks
 */
export default function ForgotPasswordPageWithProvider() {
  return (
    <QueryProvider>
      <ForgotPasswordPage />
    </QueryProvider>
  );
}
