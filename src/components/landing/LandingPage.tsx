import { Sparkles } from "lucide-react";
import { useAiGeneration } from "@/components/hooks/useAiGeneration";
import { Button } from "@/components/ui/button";
import { CharCountTextarea } from "./CharCountTextarea";
import { GenerationError } from "./GenerationError";
import { GenerationSkeleton } from "./GenerationSkeleton";
import { SaveNoteButton } from "./SaveNoteButton";
import { SavePromptBanner } from "./SavePromptBanner";
import { SummaryCard } from "./SummaryCard";

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
  const { input, isGenerating, error, result, handleInputChange, handleGenerate, handleRetry } = useAiGeneration();

  return (
    <div
      className="h-full overflow-auto bg-linear-to-br from-gradient-from via-gradient-via to-gradient-to p-4 sm:p-8"
      data-testid="landing-page"
    >
      <div className="mx-auto max-w-4xl">
        <div
          className="rounded-2xl border border-glass-border bg-linear-to-b from-glass-bg-from to-glass-bg-to p-8 shadow-2xl backdrop-blur-xl"
          data-testid="landing-page-content-area"
        >
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="mb-4 bg-linear-to-r from-gradient-heading-from via-gradient-heading-via to-gradient-heading-to bg-clip-text text-5xl font-bold text-transparent drop-shadow-lg sm:text-6xl">
              10xNotes
            </h1>
            <p className="text-xl text-glass-text-muted drop-shadow-md">
              Wygeneruj podsumowanie spotkania za pomocą AI
            </p>
          </div>

          {/* Input Area */}
          <div className="space-y-6">
            <CharCountTextarea
              value={input}
              onChange={handleInputChange}
              disabled={isGenerating}
              error={error}
              data-testid="landing-page-input-textarea"
            />

            <Button
              onClick={handleGenerate}
              variant="blue-gradient"
              size="default"
              disabled={isGenerating || !input.trim() || input.length > 5000}
              className="w-full"
              data-testid="landing-page-generate-button"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {isGenerating ? "Generowanie..." : "Generuj notatkę"}
            </Button>

            {/* Loading State */}
            {isGenerating && <GenerationSkeleton />}

            {/* Error State with Retry */}
            {error && !isGenerating && <GenerationError error={error} onRetry={handleRetry} />}

            {/* Success State */}
            {result && !isGenerating && (
              <div className="space-y-6">
                <SummaryCard data={result} />
                {isAuthenticated ? (
                  <SaveNoteButton originalContent={input} aiResult={result} />
                ) : (
                  <SavePromptBanner originalContent={input} aiResult={result} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
