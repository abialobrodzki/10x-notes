import { useCallback, useState } from "react";
import { toast } from "sonner";
import { supabaseClient } from "@/db/supabase.client";

interface UseLogoutReturn {
  logout: () => Promise<void>;
  isLoggingOut: boolean;
}

/**
 * Hook to manage user logout
 * Handles Supabase sign out, storage cleanup, and redirect
 */
export function useLogout(): UseLogoutReturn {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  /**
   * Handle user logout
   * - Sign out from Supabase
   * - Clear local storage
   * - Redirect to landing page
   */
  const logout = useCallback(async () => {
    setIsLoggingOut(true);

    try {
      // Sign out from Supabase
      await supabaseClient.auth.signOut();

      // Clear cached data
      localStorage.clear();
      sessionStorage.clear();

      // Show success toast
      toast.success("Wylogowano pomyślnie", {
        duration: 2000,
      });

      // Redirect to landing page
      setTimeout(() => {
        // eslint-disable-next-line react-compiler/react-compiler
        window.location.href = "/";
      }, 500);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Logout error:", error);

      toast.error("Błąd podczas wylogowywania", {
        description: "Spróbuj ponownie",
      });

      setIsLoggingOut(false);
    }
  }, []);

  return {
    logout,
    isLoggingOut,
  };
}
