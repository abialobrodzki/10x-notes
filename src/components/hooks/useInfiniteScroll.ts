import { useState, useEffect, useCallback } from "react";
import type { NotesListDTO, NotesListQuery, NoteListItemDTO } from "@/types";

interface UseInfiniteScrollProps {
  /** Initial notes data */
  notes: NotesListDTO;
  /** Current query parameters */
  query: NotesListQuery;
}

/**
 * Hook for managing infinite scroll (load more) functionality
 *
 * Features:
 * - Maintains accumulated notes list for infinite scroll
 * - Manages loading state during load more requests
 * - Fetches next page of notes based on current query
 * - Resets accumulated notes when data changes (SSR or filters)
 * - Handles loading state and has more indicator
 *
 * @param notes - Initial notes data from server
 * @param query - Current query parameters
 * @returns Accumulated notes, loading state, and handler
 */
export function useInfiniteScroll({ notes, query }: UseInfiniteScrollProps) {
  const [allNotes, setAllNotes] = useState<NoteListItemDTO[]>(notes.notes);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Reset allNotes when notes change (e.g., from SSR or filter change)
  useEffect(() => {
    setAllNotes(notes.notes);
  }, [notes.notes]);

  /**
   * Check if there are more pages to load
   */
  const hasMore = notes.pagination.page < notes.pagination.total_pages;

  /**
   * Load next page of notes
   */
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || notes.pagination.page >= notes.pagination.total_pages) return;

    setIsLoadingMore(true);

    try {
      // Build URL for next page
      const url = new URL("/api/notes", window.location.origin);
      const nextPage = notes.pagination.page + 1;

      // Copy all current query params
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });
      url.searchParams.set("page", String(nextPage));

      const response = await fetch(url.toString());
      if (!response.ok) throw new Error("Failed to load more notes");

      const data: NotesListDTO = await response.json();
      setAllNotes((prev) => [...prev, ...data.notes]);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error loading more notes:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, notes.pagination, query]);

  return {
    allNotes,
    isLoadingMore,
    hasMore,
    handleLoadMore,
  };
}
