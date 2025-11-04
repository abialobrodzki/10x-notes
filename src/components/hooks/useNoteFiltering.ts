import { useMemo } from "react";
import type { NoteListItemDTO } from "@/types";

interface UseNoteFilteringProps {
  /** All notes (from infinite scroll or server) */
  notes: NoteListItemDTO[];
  /** Search term for filtering */
  searchTerm: string;
}

/**
 * Hook for client-side note filtering by search term
 *
 * Features:
 * - Filters notes by summary text and tag name
 * - Case-insensitive search
 * - Memoized computation for performance
 *
 * @param notes - List of notes to filter
 * @param searchTerm - Search term for filtering
 * @returns Filtered notes list
 */
export function useNoteFiltering({ notes, searchTerm }: UseNoteFilteringProps) {
  const filteredNotes = useMemo(() => {
    if (!searchTerm || searchTerm.trim() === "") {
      return notes;
    }

    const term = searchTerm.toLowerCase();
    return notes.filter((note) => {
      const summaryMatch = note.summary_text?.toLowerCase().includes(term);
      const tagMatch = note.tag.name.toLowerCase().includes(term);
      return summaryMatch || tagMatch;
    });
  }, [notes, searchTerm]);

  return filteredNotes;
}
