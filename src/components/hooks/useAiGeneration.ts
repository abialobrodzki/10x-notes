import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { AiSummaryDTO } from "@/types";

/**
 * State model for AI generation
 */
interface AiGenerationState {
  input: string;
  isGenerating: boolean;
  error?: string;
  result?: AiSummaryDTO;
}

/**
 * Hook for managing AI summary generation
 *
 * Features:
 * - Manages input, loading, error, and result states
 * - Validates input (non-empty, max 5000 chars)
 * - Handles API communication with timeout (60s)
 * - Implements error handling for rate limiting (429), validation (400), and service errors (503)
 * - Provides retry functionality
 *
 * @returns State and handler functions for AI generation
 */
export function useAiGeneration() {
  const [state, setState] = useState<AiGenerationState>({
    input: "",
    isGenerating: false,
  });

  /**
   * Update input value
   */
  const handleInputChange = useCallback((value: string) => {
    setState((prev) => ({ ...prev, input: value, error: undefined }));
  }, []);

  /**
   * Generate AI summary from input
   */
  const handleGenerate = useCallback(async () => {
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
  }, [state.input]);

  /**
   * Retry generation after error
   */
  const handleRetry = useCallback(() => {
    setState((prev) => ({ ...prev, error: undefined }));
    handleGenerate();
  }, [handleGenerate]);

  return {
    // State
    input: state.input,
    isGenerating: state.isGenerating,
    error: state.error,
    result: state.result,
    // Handlers
    handleInputChange,
    handleGenerate,
    handleRetry,
  };
}
