import { useState, useEffect } from "react";
import AlertArea from "@/components/AlertArea";
import RegisterForm from "@/components/RegisterForm";
import { GlassCard } from "@/components/ui/composed/GlassCard";
import { supabaseClient } from "@/db/supabase.client";

/**
 * RegisterPage component - main container for registration view
 * Handles registration state and error management
 * Styled with glassmorphism to match LandingPage design
 */
export default function RegisterPage() {
  const [errors, setErrors] = useState<string[]>([]);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Redirect authenticated users to home page
  // This prevents showing register page after browser back button when user was already logged in
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
      <div className="mx-auto flex h-full overflow-auto max-w-md items-center">
        <GlassCard padding="lg" className="w-full">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="mb-2 bg-linear-to-r from-gradient-heading-from via-gradient-heading-via to-gradient-heading-to bg-clip-text text-4xl font-bold text-transparent drop-shadow-lg">
              Rejestracja
            </h1>
            <p className="text-glass-text-muted drop-shadow-md">Utwórz konto w 10xNotes</p>
          </div>

          {/* Content */}
          <div className="space-y-6">
            <AlertArea messages={errors} />
            <RegisterForm onError={setErrors} />
            {/* RedirectHint - link to login */}
            <p className="text-center text-sm text-glass-text-muted">
              Masz już konto?{" "}
              <a href="/login" className="font-medium text-glass-text hover-link">
                Zaloguj się
              </a>
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
