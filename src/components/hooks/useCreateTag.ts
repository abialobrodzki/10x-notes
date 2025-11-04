import { useCallback } from "react";
import { toast } from "sonner";
import type { NoteDetailDTO, TagDTO } from "@/types";

interface UseCreateTagReturn {
  createAndAssignTag: (tagName: string) => Promise<void>;
}

/**
 * Hook to handle tag creation and assignment to notes
 */
export function useCreateTag(
  noteId: string,
  note: NoteDetailDTO | undefined,
  mutate: (
    data?: NoteDetailDTO | Promise<NoteDetailDTO>,
    shouldRevalidate?: boolean
  ) => Promise<NoteDetailDTO | undefined>,
  setSavingFields: (updater: (prev: Record<string, boolean>) => Record<string, boolean>) => void
): UseCreateTagReturn {
  /**
   * Handle tag creation and assignment
   */
  const createAndAssignTag = useCallback(
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
        const updatePromise = fetch(`/api/notes/${noteId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ tag_id: newTag.id }),
        }).then(async (updateResponse) => {
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
        });

        // Update optimistically with the promise, don't revalidate after mutation
        await mutate(updatePromise, false);

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
    [note, noteId, mutate, setSavingFields]
  );

  return {
    createAndAssignTag,
  };
}
