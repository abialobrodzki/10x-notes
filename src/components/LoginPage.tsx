import { useState } from "react";
import AlertArea from "@/components/AlertArea";
import LoginForm from "@/components/LoginForm";
import RedirectHint from "@/components/RedirectHint";

/**
 * LoginPage component - main container for login view
 * Handles authentication state and error management
 * Styled with glassmorphism to match LandingPage design
 */
export default function LoginPage() {
  const [errors, setErrors] = useState<string[]>([]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gradient-from via-gradient-via to-gradient-to p-4 sm:p-8">
      <div className="mx-auto flex min-h-screen max-w-md items-center">
        <div className="w-full rounded-2xl border border-glass-border bg-gradient-to-b from-glass-bg-from to-glass-bg-to p-8 shadow-2xl backdrop-blur-xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="mb-2 bg-gradient-to-r from-gradient-heading-from via-gradient-heading-via to-gradient-heading-to bg-clip-text text-4xl font-bold text-transparent drop-shadow-lg">
              Logowanie
            </h1>
            <p className="text-glass-text-muted drop-shadow-md">Zaloguj się do 10xNotes</p>
          </div>

          {/* Content */}
          <div className="space-y-6">
            <AlertArea messages={errors} />
            <LoginForm onError={setErrors} />
            <RedirectHint />
          </div>
        </div>
      </div>
    </div>
  );
}
