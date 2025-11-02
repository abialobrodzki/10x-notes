import { Tag, Users } from "lucide-react";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { CreateTagDialog } from "./CreateTagDialog";
import { DeleteTagDialog } from "./DeleteTagDialog";
import type { TagWithStatsDTO } from "@/types";

interface TagSidebarProps {
  tags: TagWithStatsDTO[];
  selectedTagId: string | null;
  onTagSelect: (tagId: string | null) => void;
}

/**
 * TagSidebar - Tag navigation and management
 *
 * Features:
 * - List of tags with note counts
 * - Visual indicator for shared tags
 * - Tag selection updates URL
 * - Create new tags (CreateTagDialog)
 * - Delete tags (DeleteTagDialog - only owners, protected when tag has notes)
 * - Future: rename, manage access
 *
 * Performance optimizations:
 * - useMemo for expensive calculations (note counts, tag filtering)
 */
export function TagSidebar({ tags, selectedTagId, onTagSelect }: TagSidebarProps) {
  // Memoize total note count to avoid recalculation on every render
  const totalNoteCount = useMemo(() => tags.reduce((sum, tag) => sum + tag.note_count, 0), [tags]);

  // Memoize own and shared tag counts for footer
  const ownTagsCount = useMemo(() => tags.filter((t) => t.is_owner).length, [tags]);
  const sharedTagsCount = useMemo(() => tags.filter((t) => !t.is_owner).length, [tags]);
  return (
    <div className="flex h-full flex-col" data-testid="tag-sidebar">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <h2 className="text-lg font-semibold text-glass-text">Etykiety</h2>
        <CreateTagDialog onSuccess={() => window.location.reload()} />
      </div>

      <Separator className="bg-glass-border" />

      {/* Tags List */}
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {/* "All Notes" option */}
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-2 hover:bg-white/5! hover:text-glass-text!",
              selectedTagId === null
                ? "bg-linear-to-br from-glass-bg-from to-glass-bg-to text-glass-text hover:from-glass-bg-to! hover:to-glass-bg-from!"
                : "text-glass-text-muted"
            )}
            onClick={() => onTagSelect(null)}
            data-testid="tag-sidebar-all-notes-button"
          >
            <Tag className="h-4 w-4" />
            <span className="flex-1 text-left">Wszystkie notatki</span>
            <Badge
              variant="outline"
              className="ml-auto border-glass-border text-glass-text"
              data-testid="tag-sidebar-all-notes-count"
            >
              {totalNoteCount}
            </Badge>
          </Button>

          <Separator className="my-2 bg-glass-border" />

          {/* Individual Tags */}
          {tags.length === 0 ? (
            <div className="p-4 text-center text-sm text-glass-text-muted" data-testid="tag-sidebar-empty-message">
              Brak etykiet. Utwórz pierwszą etykietę.
            </div>
          ) : (
            tags.map((tag) => (
              <div key={tag.id} className="group relative flex items-center gap-1">
                <Button
                  variant="ghost"
                  className={cn(
                    "flex-1 justify-start gap-2 hover:bg-white/5! hover:text-glass-text!",
                    selectedTagId === tag.id
                      ? "bg-linear-to-br from-glass-bg-from to-glass-bg-to text-glass-text hover:from-glass-bg-to! hover:to-glass-bg-from!"
                      : "text-glass-text-muted"
                  )}
                  onClick={() => onTagSelect(tag.id)}
                  data-testid={`tag-sidebar-tag-button-${tag.id}`}
                >
                  <Tag className="h-4 w-4" />
                  <span className="flex-1 truncate text-left" data-testid={`tag-sidebar-tag-name-${tag.id}`}>
                    {tag.name}
                  </span>

                  {/* Shared tag indicator */}
                  {!tag.is_owner && (
                    <Users
                      className="h-3 w-3 text-glass-text-muted"
                      aria-label="Współdzielona etykieta"
                      data-testid={`tag-sidebar-shared-tag-indicator-${tag.id}`}
                    />
                  )}

                  {/* Note count */}
                  <Badge
                    variant="outline"
                    className="ml-auto border-glass-border text-glass-text"
                    data-testid={`tag-sidebar-tag-note-count-${tag.id}`}
                  >
                    {tag.note_count}
                  </Badge>
                </Button>

                {/* Delete button - only for owners */}
                {tag.is_owner && (
                  <DeleteTagDialog
                    tagId={tag.id}
                    tagName={tag.name}
                    noteCount={tag.note_count}
                    onSuccess={() => window.location.reload()}
                    data-testid={`tag-sidebar-delete-tag-dialog-${tag.id}`}
                  />
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <Separator className="bg-glass-border" />

      {/* Footer - Future: "Manage Access" button */}
      <div className="p-4">
        <p className="text-xs text-glass-text-muted" data-testid="tag-sidebar-own-tags-count">
          {ownTagsCount} moich etykiet
          {sharedTagsCount > 0 && ` • ${sharedTagsCount} współdzielonych`}
        </p>
      </div>
    </div>
  );
}
