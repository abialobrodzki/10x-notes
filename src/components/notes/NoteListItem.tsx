import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Calendar, Sparkles, Globe, User, Users } from "lucide-react";
import { memo, useMemo, useCallback } from "react";
import { GoalStatusBadge } from "@/components/shared/GoalStatusBadge";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/ui/composed";
import type { NoteListItemDTO } from "@/types";

interface NoteListItemProps {
  item: NoteListItemDTO;
  onClick: (id: string) => void;
  searchTerm?: string;
}

/**
 * NoteListItem - Single note in the list
 *
 * Features:
 * - Summary preview (truncated)
 * - Meeting date, tag, goal status badges
 * - AI/public/owner indicators
 * - Click to navigate to detail page
 * - Optional search term highlighting
 *
 * Performance optimizations:
 * - React.memo to prevent unnecessary re-renders
 * - useMemo for expensive calculations (date formatting, text truncation)
 * - useCallback for event handlers
 */
export const NoteListItem = memo(function NoteListItem({ item, onClick, searchTerm }: NoteListItemProps) {
  // Memoize meeting date parsing and formatting
  const meetingDate = useMemo(() => new Date(item.meeting_date), [item.meeting_date]);

  // Memoize summary preview truncation
  const summaryPreview = useMemo(() => {
    if (!item.summary_text) return "Brak podsumowania";
    return item.summary_text.length > 200 ? `${item.summary_text.substring(0, 200)}...` : item.summary_text;
  }, [item.summary_text]);

  // Memoize highlight logic to avoid recreation on every render
  const highlightText = useCallback(
    (text: string) => {
      if (!searchTerm || searchTerm.trim() === "") return text;

      const regex = new RegExp(`(${searchTerm})`, "gi");
      const parts = text.split(regex);

      return parts.map((part, index) =>
        regex.test(part) ? (
          <mark key={index} className="bg-yellow-200 dark:bg-yellow-800">
            {part}
          </mark>
        ) : (
          part
        )
      );
    },
    [searchTerm]
  );

  // Memoize click handler to prevent creating new function on every render
  const handleClick = useCallback(() => {
    onClick(item.id);
  }, [onClick, item.id]);

  return (
    <GlassCard hover padding="sm" className="cursor-pointer" onClick={handleClick}>
      <div className="space-y-3">
        {/* Header: Date + Indicators */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-glass-text-muted">
            <Calendar className="h-4 w-4" />
            <time dateTime={item.meeting_date}>{format(meetingDate, "PPP", { locale: pl })}</time>
          </div>

          <div className="flex items-center gap-2">
            {item.is_ai_generated && (
              <Sparkles className="h-4 w-4 text-purple-400" aria-label="Wygenerowane przez AI" />
            )}
            {item.has_public_link && <Globe className="h-4 w-4 text-blue-400" aria-label="Link publiczny" />}
            {item.is_owner && item.tag.shared_recipients && item.tag.shared_recipients > 0 && (
              <Users
                className="h-4 w-4 text-amber-400"
                aria-label={`Udostępniono ${item.tag.shared_recipients} użytkownikom`}
              />
            )}
          </div>
        </div>

        {/* Summary Preview */}
        <p className="line-clamp-3 text-sm leading-relaxed text-glass-text">{highlightText(summaryPreview)}</p>

        {/* Footer: Tag + Goal Status + Shared Indicator */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="secondary"
            className="border-glass-border bg-gradient-to-br from-glass-bg-from to-glass-bg-to text-xs text-glass-text"
          >
            {item.tag.name}
          </Badge>

          <GoalStatusBadge status={item.goal_status} className="text-xs" />

          {!item.is_owner && (
            <Badge variant="outline" className="border-amber-400/50 bg-amber-500/10 text-xs text-amber-300">
              <User className="mr-1 h-3 w-3" />
              Udostępniona
            </Badge>
          )}
        </div>
      </div>
    </GlassCard>
  );
});
