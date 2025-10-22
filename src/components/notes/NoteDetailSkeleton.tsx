import { Skeleton } from "@/components/ui/skeleton";

/**
 * NoteDetailSkeleton - Loading skeleton for note detail view
 * Displays placeholder content while data is being fetched
 */
export default function NoteDetailSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gradient-from via-gradient-via to-gradient-to p-4 sm:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header skeleton */}
        <div className="rounded-2xl border border-glass-border bg-gradient-to-b from-glass-bg-from to-glass-bg-to p-6 backdrop-blur-xl">
          <Skeleton className="mb-4 h-8 w-48 bg-input-bg" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-24 bg-input-bg" />
            <Skeleton className="h-6 w-24 bg-input-bg" />
          </div>
        </div>

        {/* Content skeleton */}
        <div className="rounded-2xl border border-glass-border bg-gradient-to-b from-glass-bg-from to-glass-bg-to p-8 backdrop-blur-xl">
          <Skeleton className="mb-4 h-6 w-32 bg-input-bg" />
          <Skeleton className="mb-2 h-4 w-full bg-input-bg" />
          <Skeleton className="mb-2 h-4 w-full bg-input-bg" />
          <Skeleton className="mb-6 h-4 w-3/4 bg-input-bg" />

          <Skeleton className="mb-4 h-6 w-32 bg-input-bg" />
          <Skeleton className="mb-2 h-4 w-full bg-input-bg" />
          <Skeleton className="mb-2 h-4 w-full bg-input-bg" />
          <Skeleton className="mb-6 h-4 w-2/3 bg-input-bg" />
        </div>

        {/* Editor skeleton */}
        <div className="rounded-2xl border border-glass-border bg-gradient-to-b from-glass-bg-from to-glass-bg-to p-8 backdrop-blur-xl">
          <Skeleton className="mb-4 h-6 w-40 bg-input-bg" />
          <Skeleton className="mb-4 h-32 w-full bg-input-bg" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24 bg-input-bg" />
            <Skeleton className="h-10 w-24 bg-input-bg" />
          </div>
        </div>
      </div>
    </div>
  );
}
