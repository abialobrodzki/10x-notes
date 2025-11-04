import { useEffect, useRef, useCallback, useState } from "react";
import { useCreateTag } from "@/components/hooks/useCreateTag";
import { useNote } from "@/components/hooks/useNote";
import { useUpdateNote } from "@/components/hooks/useUpdateNote";
import NoteContent from "./NoteContent";
import NoteDetailSkeleton from "./NoteDetailSkeleton";
import NoteErrorState from "./NoteErrorState";
import type { PublicLinkDTO } from "@/types";

interface NoteDetailPageProps {
  noteId: string;
}

/**
 * NoteDetailPage - Main container for note detail view
 * Manages data fetching via useNote hook and coordinates rendering
 */
export default function NoteDetailPage({ noteId }: NoteDetailPageProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Track which fields are being saved
  const [savingFields, setSavingFields] = useState<Record<string, boolean>>({
    summary: false,
    goal: false,
    date: false,
    tag: false,
  });

  // Fetch note data
  const { note, error, isLoading, mutate } = useNote(noteId);

  // Manage note updates
  const { handleSaveSummary, handleGoalStatusChange, handleMeetingDateChange, handleSelectTag } = useUpdateNote(
    noteId,
    note,
    mutate,
    setSavingFields
  );

  // Manage tag creation
  const { createAndAssignTag } = useCreateTag(noteId, note, mutate, setSavingFields);

  // Force scroll initialization on mount (Safari fix)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Force reflow and wake up Safari scroll
    requestAnimationFrame(() => {
      void container.offsetHeight; // Force reflow
      container.scrollTop = 1;
      requestAnimationFrame(() => {
        container.scrollTop = 0;
      });
    });
  }, [note, error, isLoading]); // Re-run when content changes

  /**
   * Handle public link update
   */
  const handlePublicLinkUpdate = useCallback(
    (publicLink: PublicLinkDTO | null) => {
      if (!note) return;

      // Update local data with new public link
      mutate(
        {
          ...note,
          public_link: publicLink,
        },
        false // Don't revalidate
      );
    },
    [note, mutate]
  );

  // Loading state
  if (isLoading) {
    return <NoteDetailSkeleton />;
  }

  // Error state
  if (error) {
    return <NoteErrorState error={error} scrollContainerRef={scrollContainerRef} />;
  }

  // No data (shouldn't happen but guard against it)
  if (!note) {
    return <NoteDetailSkeleton />;
  }

  // Success - render note details
  return (
    <NoteContent
      note={note}
      scrollContainerRef={scrollContainerRef}
      noteId={noteId}
      savingFields={savingFields}
      onSaveSummary={handleSaveSummary}
      onGoalStatusChange={handleGoalStatusChange}
      onMeetingDateChange={handleMeetingDateChange}
      onSelectTag={handleSelectTag}
      onCreateTag={createAndAssignTag}
      onPublicLinkUpdate={handlePublicLinkUpdate}
    />
  );
}
