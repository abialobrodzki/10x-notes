import { useState } from "react";
import AlertArea from "@/components/AlertArea";
import RegisterForm from "@/components/RegisterForm";

/**
 * RegisterPage component - main container for registration view
 * Handles registration state and error management
 * Styled with glassmorphism to match LandingPage design
 */
export default function RegisterPage() {
  const [errors, setErrors] = useState<string[]>([]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gradient-from via-gradient-via to-gradient-to p-4 sm:p-8">
      <div className="mx-auto flex min-h-screen max-w-md items-center">
        <div className="w-full rounded-2xl border border-glass-border bg-gradient-to-b from-glass-bg-from to-glass-bg-to p-8 shadow-2xl backdrop-blur-xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="mb-2 bg-gradient-to-r from-gradient-heading-from via-gradient-heading-via to-gradient-heading-to bg-clip-text text-4xl font-bold text-transparent drop-shadow-lg">
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
        </div>
      </div>
    </div>
  );
}
