import { Tag, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { CreateTagDialog } from "./CreateTagDialog";
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
 * - Future: CRUD operations (create, rename, delete, manage access)
 */
export function TagSidebar({ tags, selectedTagId, onTagSelect }: TagSidebarProps) {
  return (
    <div className="flex h-full flex-col">
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
              "w-full justify-start gap-2 hover:!bg-white/5 hover:!text-glass-text",
              selectedTagId === null
                ? "bg-gradient-to-br from-glass-bg-from to-glass-bg-to text-glass-text hover:!from-glass-bg-to hover:!to-glass-bg-from"
                : "text-glass-text-muted"
            )}
            onClick={() => onTagSelect(null)}
          >
            <Tag className="h-4 w-4" />
            <span className="flex-1 text-left">Wszystkie notatki</span>
            <Badge variant="outline" className="ml-auto border-glass-border text-glass-text">
              {tags.reduce((sum, tag) => sum + tag.note_count, 0)}
            </Badge>
          </Button>

          <Separator className="my-2 bg-glass-border" />

          {/* Individual Tags */}
          {tags.length === 0 ? (
            <div className="p-4 text-center text-sm text-glass-text-muted">Brak etykiet. Utwórz pierwszą etykietę.</div>
          ) : (
            tags.map((tag) => (
              <Button
                key={tag.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-2 hover:!bg-white/5 hover:!text-glass-text",
                  selectedTagId === tag.id
                    ? "bg-gradient-to-br from-glass-bg-from to-glass-bg-to text-glass-text hover:!from-glass-bg-to hover:!to-glass-bg-from"
                    : "text-glass-text-muted"
                )}
                onClick={() => onTagSelect(tag.id)}
              >
                <Tag className="h-4 w-4" />
                <span className="flex-1 truncate text-left">{tag.name}</span>

                {/* Shared tag indicator */}
                {!tag.is_owner && (
                  <Users className="h-3 w-3 text-glass-text-muted" aria-label="Współdzielona etykieta" />
                )}

                {/* Note count */}
                <Badge variant="outline" className="ml-auto border-glass-border text-glass-text">
                  {tag.note_count}
                </Badge>
              </Button>
            ))
          )}
        </div>
      </ScrollArea>

      <Separator className="bg-glass-border" />

      {/* Footer - Future: "Manage Access" button */}
      <div className="p-4">
        <p className="text-xs text-glass-text-muted">
          {tags.filter((t) => t.is_owner).length} moich etykiet
          {tags.filter((t) => !t.is_owner).length > 0 && ` • ${tags.filter((t) => !t.is_owner).length} współdzielonych`}
        </p>
      </div>
    </div>
  );
}
