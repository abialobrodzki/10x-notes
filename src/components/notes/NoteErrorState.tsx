import { GlassCard } from "@/components/ui/composed/GlassCard";

interface NoteErrorStateProps {
  error: Error | undefined;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Component to display error states for note detail page
 * Handles 404 and generic errors
 */
export default function NoteErrorState({ error, scrollContainerRef }: NoteErrorStateProps) {
  // 404 Not Found error
  if (error?.message === "Note not found") {
    return (
      <div
        ref={scrollContainerRef}
        className="h-full overflow-auto bg-linear-to-br from-gradient-from via-gradient-via to-gradient-to p-4 sm:p-8"
        data-testid="note-detail-page-404-error"
      >
        <div className="mx-auto max-w-4xl">
          <GlassCard padding="lg" className="text-center">
            <h1 className="mb-4 bg-linear-to-r from-gradient-heading-from via-gradient-heading-via to-gradient-heading-to bg-clip-text text-4xl font-bold text-transparent">
              Nie znaleziono notatki
            </h1>
            <p className="mb-6 text-glass-text-muted">Notatka o podanym ID nie istnieje lub została usunięta.</p>
            <a
              href="/notes"
              className="inline-block rounded-lg btn-gradient-primary px-6 py-3 hover-gradient"
              data-testid="note-detail-page-404-return-link"
            >
              Powrót do listy notatek
            </a>
          </GlassCard>
        </div>
      </div>
    );
  }

  // Generic error
  if (error) {
    return (
      <div
        ref={scrollContainerRef}
        className="h-full overflow-auto bg-linear-to-br from-gradient-from via-gradient-via to-gradient-to p-4 sm:p-8"
        data-testid="note-detail-page-generic-error"
      >
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-red-500/50 bg-red-500/10 p-8 text-center backdrop-blur-xl">
            <h1 className="mb-4 text-2xl font-bold text-red-200">Wystąpił błąd</h1>
            <p className="mb-6 text-red-100/90">{error.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-block rounded-lg btn-gradient-primary px-6 py-3 hover-gradient"
              data-testid="note-detail-page-generic-error-retry-button"
            >
              Spróbuj ponownie
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
