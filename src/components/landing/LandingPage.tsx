import { useState } from "react";
import { toast } from "sonner";
import { CharCountTextarea } from "./CharCountTextarea";
import { GenerateButton } from "./GenerateButton";
import { GenerationSkeleton } from "./GenerationSkeleton";
import { SavePromptBanner } from "./SavePromptBanner";
import { SummaryCard } from "./SummaryCard";
import type { AiSummaryDTO } from "@/types";

/**
 * LandingVM - View Model for Landing Page state
 */
interface LandingVM {
  input: string;
  isGenerating: boolean;
  error?: string;
  result?: AiSummaryDTO;
}

/**
 * LandingPage - Main container for anonymous AI generation
 * Allows users to paste content (up to 5000 chars) and generate summary without login
 */
export function LandingPage() {
  const [state, setState] = useState<LandingVM>({
    input: "",
    isGenerating: false,
  });

  const handleInputChange = (value: string) => {
    setState((prev) => ({ ...prev, input: value, error: undefined }));
  };

  const handleGenerate = async () => {
    // Validation: ensure input is not empty
    if (!state.input.trim()) {
      setState((prev) => ({ ...prev, error: "Treść nie może być pusta" }));
      return;
    }

    // Validation: ensure input doesn't exceed limit
    if (state.input.length > 5000) {
      setState((prev) => ({
        ...prev,
        error: "Treść przekracza limit 5000 znaków",
      }));
      return;
    }

    setState((prev) => ({ ...prev, isGenerating: true, error: undefined }));

    try {
      // Setup timeout controller (30s as per plan)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          original_content: state.input,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle rate limiting (429)
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const retrySeconds = retryAfter ? parseInt(retryAfter, 10) : 60;
        setState((prev) => ({
          ...prev,
          isGenerating: false,
          error: `Przekroczono limit generowania. Spróbuj ponownie za ${retrySeconds}s`,
        }));

        // Toast with countdown for rate limiting
        toast.error("Limit generowania przekroczony", {
          description: `Spróbuj ponownie za ${retrySeconds} sekund`,
          duration: retrySeconds * 1000,
        });
        return;
      }

      // Handle validation errors (400)
      if (response.status === 400) {
        const errorData = await response.json();
        const errorMsg = errorData.message || "Nieprawidłowa treść";
        setState((prev) => ({
          ...prev,
          isGenerating: false,
          error: errorMsg,
        }));
        toast.error("Błąd walidacji", { description: errorMsg });
        return;
      }

      // Handle service unavailable (503)
      if (response.status === 503) {
        const errorMsg = "Serwis AI jest tymczasowo niedostępny. Spróbuj ponownie za chwilę";
        setState((prev) => ({
          ...prev,
          isGenerating: false,
          error: errorMsg,
        }));
        toast.error("Serwis niedostępny", { description: errorMsg });
        return;
      }

      // Handle other errors
      if (!response.ok) {
        const errorMsg = "Wystąpił błąd podczas generowania podsumowania";
        setState((prev) => ({
          ...prev,
          isGenerating: false,
          error: errorMsg,
        }));
        toast.error("Błąd generowania", { description: errorMsg });
        return;
      }

      const result: AiSummaryDTO = await response.json();

      setState((prev) => ({
        ...prev,
        isGenerating: false,
        result,
        error: undefined,
      }));

      // Success toast
      toast.success("Podsumowanie wygenerowane pomyślnie!", {
        description: "Przewiń w dół, aby zobaczyć wynik i zapisać notatkę",
      });
    } catch (error) {
      // Handle timeout (AbortError)
      if (error instanceof Error && error.name === "AbortError") {
        const errorMsg = "Przekroczono limit czasu (30s). Spróbuj ponownie";
        setState((prev) => ({
          ...prev,
          isGenerating: false,
          error: errorMsg,
        }));
        toast.error("Timeout", { description: errorMsg });
        return;
      }

      // Handle network errors
      const errorMsg = "Błąd połączenia. Sprawdź internet i spróbuj ponownie";
      setState((prev) => ({
        ...prev,
        isGenerating: false,
        error: errorMsg,
      }));
      toast.error("Błąd sieci", { description: errorMsg });
    }
  };

  const handleRetry = () => {
    setState((prev) => ({ ...prev, error: undefined }));
    handleGenerate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-8 shadow-2xl backdrop-blur-xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="mb-4 bg-gradient-to-r from-blue-200 via-purple-200 to-pink-200 bg-clip-text text-5xl font-bold text-transparent drop-shadow-lg sm:text-6xl">
              10xNotes
            </h1>
            <p className="text-xl text-blue-100/90 drop-shadow-md">Wygeneruj podsumowanie spotkania za pomocą AI</p>
          </div>

          {/* Input Area */}
          <div className="space-y-6">
            <CharCountTextarea
              value={state.input}
              onChange={handleInputChange}
              disabled={state.isGenerating}
              error={state.error}
            />

            <GenerateButton
              onClick={handleGenerate}
              disabled={state.isGenerating || !state.input.trim() || state.input.length > 5000}
              isLoading={state.isGenerating}
            />

            {/* Loading State */}
            {state.isGenerating && <GenerationSkeleton />}

            {/* Error State with Retry */}
            {state.error && !state.isGenerating && (
              <div
                className="rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-red-200"
                role="alert"
                aria-live="assertive"
              >
                <p className="font-medium">{state.error}</p>
                {!state.error.includes("Przekroczono limit generowania") && (
                  <button
                    onClick={handleRetry}
                    className="mt-2 text-sm font-medium text-red-100 underline hover:text-red-50"
                  >
                    Spróbuj ponownie
                  </button>
                )}
              </div>
            )}

            {/* Success State */}
            {state.result && !state.isGenerating && (
              <div className="space-y-6">
                <SummaryCard data={state.result} />
                <SavePromptBanner originalContent={state.input} aiResult={state.result} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
