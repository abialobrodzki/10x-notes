interface GenerationErrorProps {
  /** Error message to display */
  error: string;
  /** Callback when retry button is clicked */
  onRetry: () => void;
}

/**
 * GenerationError - Error state component for AI generation
 *
 * Displays error message and retry button (unless rate-limited)
 */
export function GenerationError({ error, onRetry }: GenerationErrorProps) {
  // Check if error is rate limiting - hide retry button
  const isRateLimited = error.includes("Przekroczono limit generowania");

  return (
    <div
      className="rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-red-200"
      role="alert"
      aria-live="assertive"
      data-testid="generation-error"
    >
      <p className="font-medium">{error}</p>
      {!isRateLimited && (
        <button
          onClick={onRetry}
          className="mt-2 text-sm font-medium text-red-100 underline hover:text-red-50"
          data-testid="generation-error-retry-button"
        >
          Spróbuj ponownie
        </button>
      )}
    </div>
  );
}
