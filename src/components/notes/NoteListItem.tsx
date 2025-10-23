import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Calendar, Sparkles, Globe, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { NoteListItemDTO } from "@/types";

interface NoteListItemProps {
  item: NoteListItemDTO;
  onClick: (id: string) => void;
  searchTerm?: string;
}

const GOAL_STATUS_LABELS: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  achieved: { label: "Osiągnięty", variant: "default" },
  not_achieved: { label: "Nieosiągnięty", variant: "destructive" },
  undefined: { label: "Nieokreślony", variant: "outline" },
};

/**
 * NoteListItem - Single note in the list
 *
 * Features:
 * - Summary preview (truncated)
 * - Meeting date, tag, goal status badges
 * - AI/public/owner indicators
 * - Click to navigate to detail page
 * - Optional search term highlighting
 */
export function NoteListItem({ item, onClick, searchTerm }: NoteListItemProps) {
  const meetingDate = new Date(item.meeting_date);
  const goalStatusInfo = item.goal_status ? GOAL_STATUS_LABELS[item.goal_status] : null;

  // Truncate summary for preview (max 200 chars)
  const summaryPreview = item.summary_text
    ? item.summary_text.length > 200
      ? `${item.summary_text.substring(0, 200)}...`
      : item.summary_text
    : "Brak podsumowania";

  // Simple highlight logic (case-insensitive)
  const highlightText = (text: string) => {
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
  };

  return (
    <Card className="cursor-pointer transition-colors hover:bg-accent" onClick={() => onClick(item.id)}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header: Date + Indicators */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <time dateTime={item.meeting_date}>{format(meetingDate, "PPP", { locale: pl })}</time>
            </div>

            <div className="flex items-center gap-2">
              {item.is_ai_generated && (
                <Sparkles className="h-4 w-4 text-purple-500" aria-label="Wygenerowane przez AI" />
              )}
              {item.has_public_link && <Globe className="h-4 w-4 text-blue-500" aria-label="Link publiczny" />}
              {!item.is_owner && <User className="h-4 w-4 text-amber-500" aria-label="Współdzielona notatka" />}
            </div>
          </div>

          {/* Summary Preview */}
          <p className="line-clamp-3 text-sm leading-relaxed">{highlightText(summaryPreview)}</p>

          {/* Footer: Tag + Goal Status */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {item.tag.name}
            </Badge>

            {goalStatusInfo && (
              <Badge variant={goalStatusInfo.variant} className="text-xs">
                {goalStatusInfo.label}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
