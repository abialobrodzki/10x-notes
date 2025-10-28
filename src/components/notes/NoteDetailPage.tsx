import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { GlassCard } from "@/components/ui/composed/GlassCard";
import GoalStatusRadio from "./GoalStatusRadio";
import MeetingDatePicker from "./MeetingDatePicker";
import NoteDetailSkeleton from "./NoteDetailSkeleton";
import NoteHeader from "./NoteHeader";
import OriginalContentSection from "./OriginalContentSection";
import PublicLinkSection from "./PublicLinkSection";
import SummaryEditor from "./SummaryEditor";
import TagAccessButton from "./TagAccessButton";
import TagCombobox from "./TagCombobox";
import type { NoteDetailDTO, UpdateNoteCommand, GoalStatus, PublicLinkDTO, TagDTO } from "@/types";

interface NoteDetailPageProps {
  noteId: string;
}

/**
 * Fetcher function for SWR
 * Handles authentication and error responses
 */
const fetcher = async (url: string): Promise<NoteDetailDTO> => {
  const response = await fetch(url, {
    credentials: "include",
  });

  // Handle authentication errors
  if (response.status === 401 || response.status === 403) {
    // Redirect to login
    window.location.href = "/login";
    throw new Error("Authentication required");
  }

  // Handle not found
  if (response.status === 404) {
    throw new Error("Note not found");
  }

  // Handle other errors
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to fetch note");
  }

  return response.json();
};

/**
 * NoteDetailPage - Main container for note detail view
 * Fetches note data with SWR and manages display states
 */
export default function NoteDetailPage({ noteId }: NoteDetailPageProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const {
    data: note,
    error,
    isLoading,
    mutate,
  } = useSWR<NoteDetailDTO>(noteId ? `/api/notes/${noteId}` : null, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  // Track which fields are being saved
  const [savingFields, setSavingFields] = useState<Record<string, boolean>>({
    summary: false,
    goal: false,
    date: false,
    tag: false,
  });

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

  // Redirect on authentication error
  useEffect(() => {
    if (error?.message === "Authentication required") {
      window.location.href = "/login";
    }
  }, [error]);

  /**
   * Update note with optimistic update and rollback on error
   */
  const updateNote = useCallback(
    async (updates: UpdateNoteCommand, fieldName: string): Promise<void> => {
      if (!note) return;

      // Mark field as saving
      setSavingFields((prev) => ({ ...prev, [fieldName]: true }));

      try {
        // Optimistic update - immediately update local data
        await mutate(
          async () => {
            // Filter out undefined values - only send defined fields
            const cleanedUpdates = Object.fromEntries(
              Object.entries(updates).filter(([, value]) => value !== undefined)
            );

            const response = await fetch(`/api/notes/${noteId}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
              body: JSON.stringify(cleanedUpdates),
            });

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
          },
          {
            // Optimistic data - update immediately before request completes
            optimisticData: { ...note, ...updates },
            // Rollback on error
            rollbackOnError: true,
            // Revalidate after mutation
            revalidate: false,
          }
        );

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
    [note, noteId, mutate]
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

  /**
   * Handle tag creation and assignment
   */
  const handleCreateTag = useCallback(
    async (tagName: string) => {
      if (!note) return;

      setSavingFields((prev) => ({ ...prev, tag: true }));

      try {
        // First, create the tag
        const createResponse = await fetch("/api/tags", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ name: tagName }),
        });

        if (createResponse.status === 409) {
          // Tag already exists - get the existing tag from error response
          const errorData = await createResponse.json();
          toast.error(`Etykieta "${tagName}" już istnieje`, {
            description: "Wybierz ją z listy",
          });
          throw new Error(errorData.message || "Tag already exists");
        }

        if (!createResponse.ok) {
          const errorData = await createResponse.json().catch(() => ({}));
          throw new Error(errorData.message || "Failed to create tag");
        }

        const newTag: TagDTO = await createResponse.json();

        // Then, update the note with the new tag
        await mutate(
          async () => {
            const updateResponse = await fetch(`/api/notes/${noteId}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
              body: JSON.stringify({ tag_id: newTag.id }),
            });

            if (!updateResponse.ok) {
              throw new Error("Failed to update note with new tag");
            }

            const updatedNote = await updateResponse.json();

            // Merge with full tag info
            return {
              ...note,
              ...updatedNote,
              tag: { id: newTag.id, name: newTag.name },
            };
          },
          {
            optimisticData: {
              ...note,
              tag: { id: newTag.id, name: newTag.name },
            },
            rollbackOnError: true,
            revalidate: false,
          }
        );

        toast.success(`Utworzono i przypisano etykietę "${tagName}"`);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to create tag:", error);
        if (!error || (error instanceof Error && !error.message.includes("already exists"))) {
          toast.error("Nie udało się utworzyć etykiety");
        }
        throw error;
      } finally {
        setSavingFields((prev) => ({ ...prev, tag: false }));
      }
    },
    [note, noteId, mutate]
  );

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

  // Error state - 404
  if (error?.message === "Note not found") {
    return (
      <div
        ref={scrollContainerRef}
        className="h-full overflow-auto bg-gradient-to-br from-gradient-from via-gradient-via to-gradient-to p-4 sm:p-8"
      >
        <div className="mx-auto max-w-4xl">
          <GlassCard padding="lg" className="text-center">
            <h1 className="mb-4 bg-gradient-to-r from-gradient-heading-from via-gradient-heading-via to-gradient-heading-to bg-clip-text text-4xl font-bold text-transparent">
              Nie znaleziono notatki
            </h1>
            <p className="mb-6 text-glass-text-muted">Notatka o podanym ID nie istnieje lub została usunięta.</p>
            <a href="/notes" className="inline-block rounded-lg btn-gradient-primary px-6 py-3 hover-gradient">
              Powrót do listy notatek
            </a>
          </GlassCard>
        </div>
      </div>
    );
  }

  // Error state - other errors
  if (error) {
    return (
      <div
        ref={scrollContainerRef}
        className="h-full overflow-auto bg-gradient-to-br from-gradient-from via-gradient-via to-gradient-to p-4 sm:p-8"
      >
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-red-500/50 bg-red-500/10 p-8 text-center backdrop-blur-xl">
            <h1 className="mb-4 text-2xl font-bold text-red-200">Wystąpił błąd</h1>
            <p className="mb-6 text-red-100/90">{error.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-block rounded-lg btn-gradient-primary px-6 py-3 hover-gradient"
            >
              Spróbuj ponownie
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No data (shouldn't happen but guard against it)
  if (!note) {
    return <NoteDetailSkeleton />;
  }

  // Success - render note details
  return (
    <div
      ref={scrollContainerRef}
      className="h-full overflow-auto bg-gradient-to-br from-gradient-from via-gradient-via to-gradient-to p-4 sm:p-8"
    >
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header with meta information */}
        <NoteHeader tag={note.tag} isOwner={note.is_owner} publicLink={note.public_link} />

        {/* Original content section */}
        <OriginalContentSection originalContent={note.original_content} />

        {/* Summary editor panel */}
        <GlassCard padding="lg">
          <SummaryEditor
            value={note.summary_text}
            isOwner={note.is_owner}
            onSave={handleSaveSummary}
            isSaving={savingFields.summary}
          />
        </GlassCard>

        {/* Goal status and meeting date grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Goal status */}
          <GlassCard padding="lg">
            <GoalStatusRadio
              value={note.goal_status}
              isOwner={note.is_owner}
              onChange={handleGoalStatusChange}
              isSaving={savingFields.goal}
            />
          </GlassCard>

          {/* Meeting date */}
          <GlassCard padding="lg">
            <MeetingDatePicker
              value={note.meeting_date}
              isOwner={note.is_owner}
              onChange={handleMeetingDateChange}
              isSaving={savingFields.date}
            />
          </GlassCard>
        </div>

        {/* Tag selection and access management */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Tag combobox */}
          <GlassCard padding="lg">
            <TagCombobox
              currentTag={note.tag}
              isOwner={note.is_owner}
              onSelectTag={handleSelectTag}
              onCreateTag={handleCreateTag}
              isSaving={savingFields.tag}
            />
          </GlassCard>

          {/* Tag access management */}
          <GlassCard padding="lg">
            <TagAccessButton tagId={note.tag.id} isOwner={note.is_owner} />
          </GlassCard>
        </div>

        {/* Public link section (only for owners) */}
        {note.is_owner && (
          <GlassCard padding="lg">
            <PublicLinkSection
              publicLink={note.public_link}
              noteId={noteId}
              isOwner={note.is_owner}
              onUpdate={handlePublicLinkUpdate}
            />
          </GlassCard>
        )}
      </div>
    </div>
  );
}
