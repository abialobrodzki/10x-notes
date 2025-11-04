import { useCallback } from "react";
import { toast } from "sonner";
import type { NoteDetailDTO, UpdateNoteCommand, GoalStatus } from "@/types";

interface UseUpdateNoteReturn {
  handleSaveSummary: (summary: UpdateNoteCommand["summary_text"]) => Promise<void>;
  handleGoalStatusChange: (goalStatus: GoalStatus | null) => Promise<void>;
  handleMeetingDateChange: (date: UpdateNoteCommand["meeting_date"]) => Promise<void>;
  handleSelectTag: (tagId: string) => Promise<void>;
}

/**
 * Hook to manage note updates with optimistic updates and loading states
 */
export function useUpdateNote(
  noteId: string,
  note: NoteDetailDTO | undefined,
  mutate: (
    data?: NoteDetailDTO | Promise<NoteDetailDTO>,
    shouldRevalidate?: boolean
  ) => Promise<NoteDetailDTO | undefined>,
  setSavingFields: (updater: (prev: Record<string, boolean>) => Record<string, boolean>) => void
): UseUpdateNoteReturn {
  /**
   * Update note with optimistic update and rollback on error
   */
  const updateNote = useCallback(
    async (updates: UpdateNoteCommand, fieldName: string): Promise<void> => {
      if (!note) return;

      // Mark field as saving
      setSavingFields((prev) => ({ ...prev, [fieldName]: true }));

      try {
        // Filter out undefined values - only send defined fields
        const cleanedUpdates = Object.fromEntries(Object.entries(updates).filter(([, value]) => value !== undefined));

        // Optimistic update - immediately update local data
        const updatePromise = fetch(`/api/notes/${noteId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(cleanedUpdates),
        }).then(async (response) => {
          if (response.status === 401 || response.status === 403) {
            window.location.href = "/login";
            throw new Error("Authentication required");
          }

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || "Failed to update note");
          }

          const updatedNote = await response.json();

          // Merge updated fields with existing data (preserve is_owner and public_link)
          return {
            ...note,
            ...updatedNote,
          };
        });

        // Update optimistically with the promise, don't revalidate after mutation
        await mutate(updatePromise, false);

        toast.success("Zapisano zmiany");
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to update note:", error);
        toast.error(error instanceof Error ? error.message : "Nie udało się zapisać zmian");
        throw error;
      } finally {
        setSavingFields((prev) => ({ ...prev, [fieldName]: false }));
      }
    },
    [note, noteId, mutate, setSavingFields]
  );

  /**
   * Handle summary save
   */
  const handleSaveSummary = useCallback(
    async (summary: UpdateNoteCommand["summary_text"]) => {
      await updateNote({ summary_text: summary }, "summary");
    },
    [updateNote]
  );

  /**
   * Handle goal status change
   */
  const handleGoalStatusChange = useCallback(
    async (goalStatus: GoalStatus | null) => {
      await updateNote({ goal_status: goalStatus }, "goal");
    },
    [updateNote]
  );

  /**
   * Handle meeting date change
   */
  const handleMeetingDateChange = useCallback(
    async (date: UpdateNoteCommand["meeting_date"]) => {
      await updateNote({ meeting_date: date }, "date");
    },
    [updateNote]
  );

  /**
   * Handle tag selection
   */
  const handleSelectTag = useCallback(
    async (tagId: string) => {
      await updateNote({ tag_id: tagId }, "tag");
    },
    [updateNote]
  );

  return {
    handleSaveSummary,
    handleGoalStatusChange,
    handleMeetingDateChange,
    handleSelectTag,
  };
}
