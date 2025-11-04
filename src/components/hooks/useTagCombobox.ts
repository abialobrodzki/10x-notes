import { useState, useCallback, useMemo } from "react";
import useSWR from "swr";
import type { TagsListDTO, NoteDetailDTO } from "@/types";

interface UseTagComboboxProps {
  /** Current tag assigned to the note */
  currentTag: NoteDetailDTO["tag"];
  /** Callback when tag is selected */
  onSelectTag: (tagId: string) => Promise<void>;
  /** Callback when new tag is created */
  onCreateTag: (name: string) => Promise<void>;
  /** Whether the form is currently saving */
  isSaving: boolean;
}

/**
 * Fetcher for tags list
 */
const tagsFetcher = async (url: string): Promise<TagsListDTO> => {
  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch tags");
  }

  return response.json();
};

/**
 * Hook for managing tag combobox state and logic
 *
 * Features:
 * - Fetches tags list with useSWR
 * - Manages search query and open state
 * - Filters tags based on search query
 * - Detects exact tag matches
 * - Shows "Create new" option when appropriate
 * - Handles tag selection and creation with callbacks
 *
 * @param currentTag - Current tag assigned to the note
 * @param onSelectTag - Callback when tag is selected
 * @param onCreateTag - Callback when new tag is created
 * @param isSaving - Whether the form is currently saving
 * @returns Tag data, UI state, and handler functions
 */
export function useTagCombobox({ currentTag, onSelectTag, onCreateTag, isSaving }: UseTagComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch tags list (only owned tags)
  const { data: tagsData, isLoading } = useSWR<TagsListDTO>("/api/tags?include_shared=false", tagsFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  // Memoize tags array to prevent exhaustive-deps warnings
  const tags = useMemo(() => tagsData?.tags || [], [tagsData]);

  // Filter tags based on search query
  const filteredTags = useMemo(() => {
    if (!searchQuery) return tags;

    const query = searchQuery.toLowerCase();
    return tags.filter((tag) => tag.name.toLowerCase().includes(query));
  }, [tags, searchQuery]);

  // Check if search query matches existing tag exactly
  const exactMatch = useMemo(() => {
    return tags.find((tag) => tag.name.toLowerCase() === searchQuery.toLowerCase());
  }, [tags, searchQuery]);

  // Show "Create new" option only if:
  // 1. There's a search query
  // 2. No exact match exists
  // 3. Query is not empty after trim
  const showCreateOption = searchQuery.trim() && !exactMatch;

  /**
   * Handle tag selection
   */
  const handleSelectTag = useCallback(
    async (tagId: string) => {
      if (isSaving) return;

      try {
        await onSelectTag(tagId);
        setIsOpen(false);
        setSearchQuery("");
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to select tag:", error);
      }
    },
    [isSaving, onSelectTag]
  );

  /**
   * Handle new tag creation
   */
  const handleCreateTag = useCallback(async () => {
    if (isSaving || !searchQuery.trim()) return;

    try {
      await onCreateTag(searchQuery.trim());
      setIsOpen(false);
      setSearchQuery("");
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to create tag:", error);
    }
  }, [isSaving, searchQuery, onCreateTag]);

  return {
    // State
    isOpen,
    searchQuery,
    tags,
    filteredTags,
    showCreateOption,
    isLoading,
    currentTag,
    // Setters
    setIsOpen,
    setSearchQuery,
    // Handlers
    handleSelectTag,
    handleCreateTag,
  };
}
