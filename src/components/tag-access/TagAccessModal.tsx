import { useTagAccess } from "@/components/hooks/useTagAccess";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AddRecipientForm } from "./AddRecipientForm";
import { RecipientsList } from "./RecipientsList";
import type { UUID } from "@/types";

interface TagAccessModalProps {
  /** Tag ID for access management */
  tagId: UUID;
  /** Whether current user is the tag owner */
  isOwner: boolean;
  /** Whether modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
}

/**
 * TagAccessModal - Modal for managing tag access recipients
 *
 * Features:
 * - View list of recipients with read-only access
 * - Add new recipients by email
 * - Remove recipient access
 * - Focus management and ESC key handling
 */
export function TagAccessModal({ tagId, isOwner, isOpen, onClose }: TagAccessModalProps) {
  const { recipients, loading, removing, error, handleRemoveRecipient } = useTagAccess({
    tagId,
    isOpen,
    isOwner,
  });

  // Don't render modal if user is not owner
  if (!isOwner) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]" data-testid="tag-access-modal">
        <DialogHeader>
          <DialogTitle>Zarządzanie dostępem do etykiety</DialogTitle>
          <DialogDescription>
            Dodawaj i usuwaj użytkowników, którzy mają dostęp tylko do odczytu wszystkich notatek z tą etykietą.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-[300px] space-y-6">
          {error && (
            <div
              className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
              role="alert"
              aria-live="polite"
              data-testid="tag-access-modal-error"
            >
              {error}
            </div>
          )}

          <RecipientsList
            recipients={recipients}
            loading={loading}
            removing={removing}
            onRemove={handleRemoveRecipient}
          />

          <AddRecipientForm tagId={tagId} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
