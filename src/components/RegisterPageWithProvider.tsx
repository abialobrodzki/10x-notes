import { QueryProvider } from "@/components/QueryProvider";
import RegisterPage from "@/components/RegisterPage";

/**
 * RegisterPageWithProvider - wraps RegisterPage with QueryProvider
 * Required because RegisterPage uses TanStack Query mutation hooks
 */
export default function RegisterPageWithProvider() {
  return (
    <QueryProvider>
      <RegisterPage />
    </QueryProvider>
  );
}
