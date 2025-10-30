import { useState, useMemo } from "react";
import AlertArea from "@/components/AlertArea";
import ForgotPasswordForm from "@/components/ForgotPasswordForm";
import { GlassCard } from "@/components/ui/composed/GlassCard";

/**
 * ForgotPasswordPage component - main container for password reset request view
 * Handles password reset request state and displays success/error messages
 * Styled with glassmorphism to match LoginPage design
 */
export default function ForgotPasswordPage() {
  // Check for error parameter in URL (client-side only)
  const initialErrors = useMemo(() => {
    // Guard clause for SSR - window is not available on server
    if (typeof window === "undefined") return [];

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("error") === "invalid_token") {
      return ["Link do resetowania hasła jest nieprawidłowy lub wygasł. Spróbuj ponownie."];
    }
    return [];
  }, []);

  const [errors, setErrors] = useState<string[]>(initialErrors);
  const [success, setSuccess] = useState(false);

  return (
    <div className="h-full overflow-auto bg-linear-to-br from-gradient-from via-gradient-via to-gradient-to p-4 sm:p-8">
      <div className="mx-auto flex h-full max-w-md items-center">
        <GlassCard padding="lg" className="w-full">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="mb-2 bg-linear-to-r from-gradient-heading-from via-gradient-heading-via to-gradient-heading-to bg-clip-text text-4xl font-bold text-transparent drop-shadow-lg">
              Resetowanie hasła
            </h1>
            <p className="text-glass-text-muted drop-shadow-md">
              Wprowadź swój adres email, aby otrzymać link do resetowania hasła
            </p>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {success ? (
              <>
                <AlertArea
                  messages={[
                    "Email z linkiem do resetowania hasła został wysłany.",
                    "Sprawdź swoją skrzynkę pocztową i kliknij link, aby ustawić nowe hasło.",
                  ]}
                  variant="success"
                />
                <div className="text-center">
                  <a href="/login" className="text-sm text-glass-text hover-link">
                    Powrót do logowania
                  </a>
                </div>
              </>
            ) : (
              <>
                <AlertArea messages={errors} />
                <ForgotPasswordForm onError={setErrors} onSuccess={setSuccess} />
                <div className="text-center">
                  <a href="/login" className="text-sm text-glass-text hover-link">
                    Powrót do logowania
                  </a>
                </div>
              </>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
