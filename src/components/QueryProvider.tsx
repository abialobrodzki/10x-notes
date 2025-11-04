import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type { ReactNode } from "react";

/**
 * Creates a QueryClient with optimized settings for the application
 */
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Cache data for 5 minutes
        staleTime: 5 * 60 * 1000,
        // Keep cache in memory for 10 minutes
        gcTime: 10 * 60 * 1000,
        // Don't retry failed queries in development
        retry: false,
      },
      mutations: {
        // Retry failed mutations once
        retry: 1,
      },
    },
  });
}

/**
 * QueryProvider - Initializes TanStack Query and wraps children with QueryClientProvider
 * Also includes React Query Devtools for debugging
 *
 * Usage:
 * <QueryProvider>
 *   <YourComponent />
 * </QueryProvider>
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const queryClient = createQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
