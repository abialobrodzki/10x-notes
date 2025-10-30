import { useState, useMemo } from "react";
import AlertArea from "@/components/AlertArea";
import LoginForm from "@/components/LoginForm";
import RedirectHint from "@/components/RedirectHint";
import { GlassCard } from "@/components/ui/composed/GlassCard";

/**
 * LoginPage component - main container for login view
 * Handles authentication state and error management
 * Styled with glassmorphism to match LandingPage design
 */
export default function LoginPage() {
  const [errors, setErrors] = useState<string[]>([]);

  // Check for reset success parameter in URL (client-side only)
  const successMessage = useMemo(() => {
    // Guard clause for SSR - window is not available on server
    if (typeof window === "undefined") return null;

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("reset") === "success") {
      return "Hasło zostało zmienione pomyślnie! Możesz się teraz zalogować.";
    }
    return null;
  }, []);

  return (
    <div className="h-full overflow-auto bg-linear-to-br from-gradient-from via-gradient-via to-gradient-to p-4 sm:p-8">
      <div className="mx-auto flex h-full max-w-md items-center">
        <GlassCard padding="lg" className="w-full">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="mb-2 bg-linear-to-r from-gradient-heading-from via-gradient-heading-via to-gradient-heading-to bg-clip-text text-4xl font-bold text-transparent drop-shadow-lg">
              Logowanie
            </h1>
            <p className="text-glass-text-muted drop-shadow-md">Zaloguj się do 10xNotes</p>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {successMessage && <AlertArea messages={[successMessage]} variant="success" />}
            <AlertArea messages={errors} />
            <LoginForm onError={setErrors} />
            {/* Forgot password link */}
            <div className="text-center">
              <a href="/forgot-password" className="text-sm text-glass-text hover-link">
                Nie pamiętasz hasła?
              </a>
            </div>
            <RedirectHint />
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
