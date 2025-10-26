import { Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CharCountTextarea } from "./CharCountTextarea";
import { GenerationSkeleton } from "./GenerationSkeleton";
import { SaveNoteButton } from "./SaveNoteButton";
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

interface LandingPageProps {
  /** Whether user is authenticated */
  isAuthenticated: boolean;
}

/**
 * LandingPage - Main container for AI generation
 * Allows users to paste content (up to 5000 chars) and generate summary
 * - Anonymous users: shown SavePromptBanner (login/register to save)
 * - Authenticated users: shown SaveNoteButton (direct save)
 */
export function LandingPage({ isAuthenticated }: LandingPageProps) {
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
      // Setup timeout controller (60s as per plan)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

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
        const errorMsg = "Przekroczono limit czasu (60s). Spróbuj ponownie";
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
    <div className="min-h-screen bg-gradient-to-br from-gradient-from via-gradient-via to-gradient-to p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-2xl border border-glass-border bg-gradient-to-b from-glass-bg-from to-glass-bg-to p-8 shadow-2xl backdrop-blur-xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="mb-4 bg-gradient-to-r from-gradient-heading-from via-gradient-heading-via to-gradient-heading-to bg-clip-text text-5xl font-bold text-transparent drop-shadow-lg sm:text-6xl">
              10xNotes
            </h1>
            <p className="text-xl text-glass-text-muted drop-shadow-md">
              Wygeneruj podsumowanie spotkania za pomocą AI
            </p>
          </div>

          {/* Input Area */}
          <div className="space-y-6">
            <CharCountTextarea
              value={state.input}
              onChange={handleInputChange}
              disabled={state.isGenerating}
              error={state.error}
            />

            <Button
              onClick={handleGenerate}
              variant="blue-gradient"
              size="default"
              disabled={state.isGenerating || !state.input.trim() || state.input.length > 5000}
              className="w-full"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {state.isGenerating ? "Generowanie..." : "Generuj notatkę"}
            </Button>

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
                {isAuthenticated ? (
                  <SaveNoteButton originalContent={state.input} aiResult={state.result} />
                ) : (
                  <SavePromptBanner originalContent={state.input} aiResult={state.result} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
