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
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 p-4 sm:p-8">
      <div className="mx-auto flex min-h-screen max-w-md items-center">
        <div className="w-full rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-8 shadow-2xl backdrop-blur-xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="mb-2 bg-gradient-to-r from-blue-200 via-purple-200 to-pink-200 bg-clip-text text-4xl font-bold text-transparent drop-shadow-lg">
              Logowanie
            </h1>
            <p className="text-blue-100/90 drop-shadow-md">Zaloguj się do 10xNotes</p>
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
