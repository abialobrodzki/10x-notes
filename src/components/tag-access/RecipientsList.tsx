import { useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { RecipientItem } from "./RecipientItem";
import type { TagAccessRecipientDTO } from "@/types";

interface RecipientsListProps {
  /** List of recipients with access */
  recipients: TagAccessRecipientDTO[];
  /** Whether data is loading */
  loading: boolean;
  /** Map of recipient IDs currently being removed */
  removing: Record<string, boolean>;
  /** Callback when recipient should be removed */
  onRemove: (recipientId: string) => void;
}

/**
 * RecipientsList - Displays list of recipients with tag access
 *
 * Features:
 * - Shows recipient email and grant date
 * - Allows removing recipient access
 * - Loading state with skeletons
 * - Empty state message
 *
 * Performance optimizations:
 * - useCallback to avoid creating new onRemove functions for each item
 */
export function RecipientsList({ recipients, loading, removing, onRemove }: RecipientsListProps) {
  // Create stable callback function that returns a handler for specific recipient
  const createRemoveHandler = useCallback(
    (recipientId: string) => () => {
      onRemove(recipientId);
    },
    [onRemove]
  );
  if (loading) {
    return (
      <div className="space-y-3" data-testid="recipients-list-loading">
        <h3 className="text-sm font-medium">Użytkownicy z dostępem</h3>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-9 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="recipients-list">
      <h3 className="text-sm font-medium">Użytkownicy z dostępem ({recipients.length})</h3>

      {recipients.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center" data-testid="recipients-list-empty">
          <p className="text-sm text-muted-foreground">Brak użytkowników z dostępem do tej etykiety</p>
        </div>
      ) : (
        <div className="space-y-2" data-testid="recipients-list-items">
          {recipients.map((recipient) => (
            <RecipientItem
              key={recipient.recipient_id}
              recipient={recipient}
              isRemoving={removing[recipient.recipient_id] || false}
              onRemove={createRemoveHandler(recipient.recipient_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
