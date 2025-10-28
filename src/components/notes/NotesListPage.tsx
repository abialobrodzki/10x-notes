import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getPendingNote, clearPendingNote } from "@/lib/utils/pending-note.utils";
import { AppShell } from "./AppShell";
import type { NotesListDTO, TagsListDTO, NotesListQuery } from "@/types";

interface NotesListPageProps {
  initialNotes: NotesListDTO;
  initialTags: TagsListDTO;
  initialQuery: NotesListQuery;
  initialError: string | null;
}

/**
 * NotesListPage - Main container for notes list view
 *
 * Features:
 * - SSR initial data with SWR for updates
 * - URL-synced filters and search
 * - Responsive layout (desktop sidebar, mobile drawer)
 * - Auto-save pending notes from sessionStorage (when ?autoSave=true)
 */
export function NotesListPage({ initialNotes, initialTags, initialQuery, initialError }: NotesListPageProps) {
  const [notes] = useState(initialNotes);
  const [tags] = useState(initialTags);
  const [query] = useState(initialQuery);
  const [error] = useState(initialError);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Handle auto-save on mount if autoSave=true URL param is present
  useEffect(() => {
    const handleAutoSave = async () => {
      // Check for autoSave URL parameter
      const urlParams = new URLSearchParams(window.location.search);
      const shouldAutoSave = urlParams.get("autoSave") === "true";

      if (!shouldAutoSave) {
        return;
      }

      // Get pending note from sessionStorage
      const pendingNote = getPendingNote();

      if (!pendingNote) {
        // No pending note found or expired
        toast.info("Nie znaleziono notatki do zapisania", {
          description: "Sesja mogła wygasnąć. Wygeneruj nową notatkę.",
        });

        // Clean up URL
        window.history.replaceState({}, "", "/notes");
        return;
      }

      // Show loading toast
      setIsAutoSaving(true);
      const loadingToast = toast.loading("Zapisywanie notatki...");

      try {
        // Prepare request body - only include meeting_date if it's not null
        const requestBody: Record<string, unknown> = {
          original_content: pendingNote.original_content,
          summary_text: pendingNote.summary_text,
          goal_status: pendingNote.goal_status,
          tag_name: pendingNote.suggested_tag || "Bez etykiety",
          is_ai_generated: true,
        };

        // Only add meeting_date if it's not null (API will default to today's date)
        if (pendingNote.meeting_date !== null) {
          requestBody.meeting_date = pendingNote.meeting_date;
        }

        // Call API to save the note
        const response = await fetch("/api/notes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          // Handle specific errors
          if (response.status === 401 || response.status === 403) {
            throw new Error("Sesja wygasła. Zaloguj się ponownie.");
          }

          if (response.status === 400) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Nieprawidłowe dane notatki");
          }

          throw new Error("Nie udało się zapisać notatki");
        }

        const savedNote = await response.json();

        // Success - clear sessionStorage
        clearPendingNote();

        // Dismiss loading toast and show success
        toast.dismiss(loadingToast);
        toast.success("Notatka zapisana pomyślnie!", {
          description: "Przekierowywanie do szczegółów...",
        });

        // Redirect to the saved note after a brief delay
        setTimeout(() => {
          window.location.href = `/notes/${savedNote.id}`;
        }, 1000);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Auto-save failed:", error);

        // Dismiss loading toast
        toast.dismiss(loadingToast);

        // Show error toast with retry option
        const errorMessage = error instanceof Error ? error.message : "Wystąpił nieoczekiwany błąd";

        toast.error("Nie udało się zapisać notatki", {
          description: errorMessage,
          action: {
            label: "Spróbuj ponownie",
            onClick: () => {
              // Reload the page to retry
              window.location.reload();
            },
          },
          duration: 10000, // Keep error toast longer
        });

        // Keep pending note in storage for retry
        // Clean up URL
        window.history.replaceState({}, "", "/notes");
        setIsAutoSaving(false);
      }
    };

    handleAutoSave();
  }, []);

  useEffect(() => {
    if (error) {
      // eslint-disable-next-line no-console
      console.error("Initial data error:", error);
    }
  }, [error]);

  // Show loading overlay during auto-save
  if (isAutoSaving) {
    return (
      <div className="flex h-full overflow-auto items-center justify-center bg-linear-to-br from-gradient-from via-gradient-via to-gradient-to">
        <div className="rounded-lg border border-glass-border bg-glass-bg-from p-8 text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gradient-button-from border-t-transparent" />
          <p className="text-glass-text">Zapisywanie notatki...</p>
        </div>
      </div>
    );
  }

  return <AppShell notes={notes} tags={tags} query={query} error={error} />;
}
