import { useState, useEffect } from "react";
import AlertArea from "@/components/AlertArea";
import ResetPasswordForm from "@/components/ResetPasswordForm";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/composed/GlassCard";
import { supabaseClient } from "@/db/supabase.client";

interface ResetPasswordPageProps {
  token: string;
}

/**
 * ResetPasswordPage component - main container for password reset view
 * Handles password reset state and displays success/error messages
 * Styled with glassmorphism to match LoginPage design
 */
export default function ResetPasswordPage({ token }: ResetPasswordPageProps) {
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Redirect authenticated users to home page
  // This prevents showing reset password page after browser back button when user was already logged in
  useEffect(() => {
    const checkAuth = async () => {
      // Use Supabase client-side session check (fast, no HTTP request)
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();

      if (session) {
        // User is authenticated, redirect to home
        setIsRedirecting(true);
        window.location.href = "/";
      }
    };

    // Check auth on mount
    checkAuth();

    // Handle bfcache (back-forward cache) - when user presses back button
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        checkAuth();
      }
    };

    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  // Show nothing while checking authentication
  // This prevents FOUC (Flash Of Unstyled Content) when redirecting authenticated users
  if (isRedirecting) {
    return <div />;
  }

  return (
    <div className="h-full overflow-auto bg-linear-to-br from-gradient-from via-gradient-via to-gradient-to p-4 sm:p-8">
      <div className="mx-auto flex h-full max-w-md items-center">
        <GlassCard padding="lg" className="w-full">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="mb-2 bg-linear-to-r from-gradient-heading-from via-gradient-heading-via to-gradient-heading-to bg-clip-text text-4xl font-bold text-transparent drop-shadow-lg">
              Nowe hasło
            </h1>
            <p className="text-glass-text-muted drop-shadow-md">Wprowadź nowe hasło do swojego konta</p>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {success ? (
              <>
                <AlertArea
                  messages={[
                    "Hasło zostało zmienione pomyślnie!",
                    "Możesz teraz zalogować się do swojego konta używając nowego hasła.",
                  ]}
                  variant="success"
                />
                <Button
                  variant="gradient"
                  className="w-full"
                  onClick={() => {
                    window.location.href = "/login?reset=success";
                  }}
                >
                  Przejdź do logowania
                </Button>
              </>
            ) : (
              <>
                <AlertArea messages={errors} />
                <ResetPasswordForm token={token} onError={setErrors} onSuccess={setSuccess} />
              </>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
