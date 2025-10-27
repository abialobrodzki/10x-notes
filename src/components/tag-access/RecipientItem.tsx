import { Trash2 } from "lucide-react";
import { memo, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/composed/GlassCard";
import type { TagAccessRecipientDTO } from "@/types";

interface RecipientItemProps {
  /** Recipient details */
  recipient: TagAccessRecipientDTO;
  /** Whether this recipient is currently being removed */
  isRemoving: boolean;
  /** Callback when remove button is clicked */
  onRemove: () => void;
}

/**
 * Format date string to Polish locale
 * Pure function - extracted outside component to avoid recreation
 */
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("pl-PL", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return dateString;
  }
};

/**
 * RecipientItem - Single recipient display with remove action
 *
 * Features:
 * - Shows recipient email
 * - Shows grant date in readable format
 * - Remove button with loading state
 * - Optimistic UI update
 *
 * Performance optimizations:
 * - React.memo to prevent unnecessary re-renders
 * - formatDate extracted as pure function
 * - useMemo for formatted date
 */
export const RecipientItem = memo(function RecipientItem({ recipient, isRemoving, onRemove }: RecipientItemProps) {
  // Memoize formatted date to avoid recalculation on every render
  const formattedDate = useMemo(() => formatDate(recipient.granted_at), [recipient.granted_at]);

  return (
    <GlassCard
      padding="sm"
      className="flex items-center justify-between transition-opacity"
      style={{ opacity: isRemoving ? 0.5 : 1 }}
    >
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium">{recipient.email}</p>
        <p className="text-xs text-muted-foreground">Dostęp nadany: {formattedDate}</p>
      </div>

      <Button
        variant="ghost"
        size="sm"
        disabled={isRemoving}
        onClick={onRemove}
        className="text-destructive hover-destructive"
        aria-label={`Usuń dostęp dla ${recipient.email}`}
      >
        <Trash2 className="h-4 w-4" />
        {isRemoving ? "Usuwanie..." : "Usuń"}
      </Button>
    </GlassCard>
  );
});
