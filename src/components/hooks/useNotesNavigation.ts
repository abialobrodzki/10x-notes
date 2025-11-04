import { useState, useMemo, useCallback } from "react";
import type { NotesListQuery } from "@/types";

interface UseNotesNavigationProps {
  /** Current query parameters */
  query: NotesListQuery;
}

/**
 * Hook for managing notes navigation, filtering, and search
 *
 * Features:
 * - Manages client-side search term state
 * - Handles tag selection with URL updates
 * - Manages filter changes with URL updates
 * - Manages pagination with URL updates
 * - Computes active filter state
 * - Resets pagination on filter changes
 *
 * @param query - Current query parameters from URL
 * @returns Navigation state and handler functions
 */
export function useNotesNavigation({ query }: UseNotesNavigationProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const selectedTagId = query.tag_id || null;

  /**
   * Check if user has any active filters (excluding pagination/sorting)
   */
  const hasActiveFilters = useMemo(() => {
    return Boolean(query.tag_id || query.goal_status || query.date_from || query.date_to);
  }, [query.tag_id, query.goal_status, query.date_from, query.date_to]);

  /**
   * Handle tag selection and update URL
   */
  const handleTagSelect = useCallback((tagId: string | null) => {
    // Update URL with new tag_id
    const url = new URL(window.location.href);
    if (tagId) {
      url.searchParams.set("tag_id", tagId);
    } else {
      url.searchParams.delete("tag_id");
    }
    // Reset to page 1 when changing filters
    url.searchParams.set("page", "1");
    // eslint-disable-next-line react-compiler/react-compiler
    window.location.href = url.toString();
  }, []);

  /**
   * Handle filter changes and update URL
   */
  const handleFiltersChange = useCallback((newFilters: NotesListQuery) => {
    // Update URL with new filters
    const url = new URL(window.location.href);

    // Apply all filter params
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      } else {
        url.searchParams.delete(key);
      }
    });

    window.location.href = url.toString();
  }, []);

  /**
   * Handle page change and update URL
   */
  const handlePageChange = useCallback((page: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set("page", String(page));
    window.location.href = url.toString();
  }, []);

  return {
    // State
    searchTerm,
    selectedTagId,
    hasActiveFilters,
    // Setters
    setSearchTerm,
    // Handlers
    handleTagSelect,
    handleFiltersChange,
    handlePageChange,
  };
}
