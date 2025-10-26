import { FileText } from "lucide-react";
import { GlassCard } from "@/components/ui/composed/GlassCard";
import { Skeleton } from "@/components/ui/skeleton";
import { NoteListItem } from "./NoteListItem";
import type { NoteListItemDTO } from "@/types";

interface NoteListProps {
  items: NoteListItemDTO[];
  isLoading?: boolean;
  searchTerm?: string;
  onItemClick: (id: string) => void;
}

/**
 * NoteList - Display list of notes
 *
 * Features:
 * - Renders list of note items
 * - Loading skeleton states
 * - Empty state when no notes
 * - TODO: Virtualization for >100 items (optimization)
 */
export function NoteList({ items, isLoading, searchTerm, onItemClick }: NoteListProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <GlassCard key={i} padding="sm">
            <div className="space-y-3">
              <Skeleton className="h-4 w-32 bg-white/20" />
              <Skeleton className="h-16 w-full bg-white/20" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20 bg-white/20" />
                <Skeleton className="h-6 w-24 bg-white/20" />
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    );
  }

  // Empty state
  if (items.length === 0) {
    return (
      <GlassCard padding="lg" className="flex flex-col items-center justify-center text-center border-dashed">
        <FileText className="mb-4 h-12 w-12 text-glass-text-muted" />
        <h3 className="mb-2 text-lg font-semibold text-glass-text">Brak notatek</h3>
        <p className="mb-6 text-sm text-glass-text-muted">
          {searchTerm
            ? "Nie znaleziono notatek pasujących do Twojego wyszukiwania."
            : "Nie masz jeszcze żadnych notatek. Utwórz pierwszą notatkę."}
        </p>
        {!searchTerm && (
          <a href="/" className="rounded-lg btn-gradient-primary px-6 py-2.5 text-sm font-medium hover-gradient">
            Generuj pierwszą notatkę
          </a>
        )}
      </GlassCard>
    );
  }

  // Notes list
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <NoteListItem key={item.id} item={item} onClick={onItemClick} searchTerm={searchTerm} />
      ))}
    </div>
  );
}
