import { useState } from "react";
import AlertArea from "@/components/AlertArea";
import ResetPasswordForm from "@/components/ResetPasswordForm";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/composed/GlassCard";

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
