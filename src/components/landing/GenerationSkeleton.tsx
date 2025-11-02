import { Skeleton } from "@/components/ui/skeleton";

/**
 * GenerationSkeleton - Loading state for AI generation (3-10s expected, 60s timeout)
 * Displays placeholder cards and bars to indicate processing
 */
export function GenerationSkeleton() {
  return (
    <div
      className="space-y-4 rounded-lg border border-blue-400/30 bg-blue-500/10 p-6"
      role="status"
      aria-live="polite"
      aria-label="Generowanie podsumowania w toku"
      data-testid="generation-skeleton"
    >
      {/* Loading indicator text */}
      <div className="flex items-center space-x-2">
        <div className="h-2 w-2 animate-pulse rounded-full bg-blue-400" />
        <div className="h-2 w-2 animate-pulse rounded-full bg-blue-400 animation-delay-200" />
        <div className="h-2 w-2 animate-pulse rounded-full bg-blue-400 animation-delay-400" />
        <span className="text-sm text-blue-200" data-testid="generation-skeleton-loading-text">
          Analizuję treść i generuję podsumowanie...
        </span>
      </div>

      {/* Summary section skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-32 bg-blue-300/20" />
        <Skeleton className="h-4 w-full bg-blue-300/20" />
        <Skeleton className="h-4 w-full bg-blue-300/20" />
        <Skeleton className="h-4 w-3/4 bg-blue-300/20" />
      </div>

      {/* Goal status skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-24 bg-blue-300/20" />
        <div className="flex space-x-2">
          <Skeleton className="h-8 w-20 rounded-full bg-blue-300/20" />
          <Skeleton className="h-8 w-20 rounded-full bg-blue-300/20" />
          <Skeleton className="h-8 w-20 rounded-full bg-blue-300/20" />
        </div>
      </div>

      {/* Tag suggestion skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-32 bg-blue-300/20" />
        <Skeleton className="h-6 w-40 rounded-md bg-blue-300/20" />
      </div>

      {/* Processing time notice */}
      <p className="text-xs text-blue-300/70">Proces może potrwać do 60 sekund</p>
    </div>
  );
}
