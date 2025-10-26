import { Trash2, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface DeleteTagDialogProps {
  tagId: string;
  tagName: string;
  noteCount: number;
  onSuccess: () => void;
}

/**
 * DeleteTagDialog - Confirm and execute tag deletion
 *
 * Features:
 * - Confirmation dialog with tag name and note count
 * - Warning when tag has notes (cannot delete)
 * - API call to DELETE /api/tags/{id}
 * - Error handling for 409 Conflict (tag has notes)
 * - Toast notifications
 * - Loading state during deletion
 */
export function DeleteTagDialog({ tagId, tagName, noteCount, onSuccess }: DeleteTagDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/tags/${tagId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        // Handle 409 Conflict (tag has notes)
        if (response.status === 409) {
          const errorData = await response.json();
          toast.error("Nie można usunąć etykiety", {
            description: errorData.details || "Ta etykieta ma przypisane notatki",
            duration: 5000,
          });
          setIsDeleting(false);
          setIsOpen(false);
          return;
        }

        // Handle 404 Not Found
        if (response.status === 404) {
          toast.error("Etykieta nie istnieje", {
            description: "Etykieta została już usunięta lub nie masz do niej dostępu",
          });
          setIsDeleting(false);
          setIsOpen(false);
          onSuccess(); // Reload to update list
          return;
        }

        // Handle 403 Forbidden
        if (response.status === 403) {
          toast.error("Brak uprawnień", {
            description: "Nie jesteś właścicielem tej etykiety",
          });
          setIsDeleting(false);
          setIsOpen(false);
          return;
        }

        // Generic error
        throw new Error("Failed to delete tag");
      }

      // Success (204 No Content)
      toast.success("Etykieta usunięta", {
        description: `Etykieta "${tagName}" została usunięta`,
      });

      setIsOpen(false);
      onSuccess(); // Reload page to update list
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to delete tag:", error);

      toast.error("Błąd podczas usuwania", {
        description: "Spróbuj ponownie później",
      });

      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-glass-text-muted hover-destructive"
          aria-label="Usuń etykietę"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-lg border-glass-border bg-gradient-to-b from-glass-bg-from to-glass-bg-to backdrop-blur-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive outline-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            <AlertTriangle className="h-5 w-5" />
            Usuń etykietę
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2 text-glass-text-muted">
            <p>
              Czy na pewno chcesz usunąć etykietę{" "}
              <span className="font-semibold text-glass-text">&quot;{tagName}&quot;</span>?
            </p>
            {noteCount > 0 && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <p className="font-medium">⚠️ Ta etykieta ma {noteCount} przypisanych notatek</p>
                <p className="mt-1 text-xs">
                  Nie możesz usunąć etykiety z notatkami. Najpierw przenieś notatki do innej etykiety lub usuń je.
                </p>
              </div>
            )}
            {noteCount === 0 && (
              <p className="text-sm">Ta akcja jest nieodwracalna. Etykieta zostanie trwale usunięta.</p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" disabled={isDeleting}>
              Anuluj
            </Button>
          </AlertDialogCancel>
          {noteCount === 0 && (
            <AlertDialogAction asChild>
              <Button variant="destructive-action" disabled={isDeleting} onClick={handleDelete}>
                {isDeleting ? "Usuwanie..." : "Usuń Tag"}
              </Button>
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
