import LoginPage from "@/components/LoginPage";
import { QueryProvider } from "@/components/QueryProvider";

/**
 * LoginPageWithProvider - wraps LoginPage with QueryProvider
 * Required because LoginPage uses TanStack Query mutation hooks
 */
export default function LoginPageWithProvider() {
  return (
    <QueryProvider>
      <LoginPage />
    </QueryProvider>
  );
}
