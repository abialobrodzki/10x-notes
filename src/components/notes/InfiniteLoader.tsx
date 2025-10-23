import { Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";

interface InfiniteLoaderProps {
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

/**
 * InfiniteLoader - Mobile infinite scroll loader
 *
 * Features:
 * - Intersection Observer for scroll detection
 * - Sentinel element triggers load when visible
 * - Loading spinner
 * - Automatic cleanup
 */
export function InfiniteLoader({ loading, hasMore, onLoadMore }: InfiniteLoaderProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || loading) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // When sentinel becomes visible, load more
        if (entries[0]?.isIntersecting) {
          onLoadMore();
        }
      },
      {
        root: null, // viewport
        rootMargin: "100px", // trigger 100px before reaching sentinel
        threshold: 0.1,
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loading, onLoadMore]);

  if (!hasMore) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Brak więcej notatek</div>;
  }

  return (
    <div ref={sentinelRef} className="flex items-center justify-center py-8">
      {loading && (
        <>
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Ładowanie...</span>
        </>
      )}
    </div>
  );
}
