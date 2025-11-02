import { Tag } from "lucide-react";
import { cn } from "@/lib/utils";

interface SuggestedTagBadgeProps {
  tagName: string | null;
  className?: string;
}

/**
 * SuggestedTagBadge - Display for AI-suggested tag name
 * Shows suggested tag with icon, or fallback message if no suggestion
 */
export function SuggestedTagBadge({ tagName, className }: SuggestedTagBadgeProps) {
  if (!tagName) {
    return (
      <div
        className={cn(
          "inline-flex items-center space-x-2 rounded-md border border-gray-500/30 bg-gray-500/10 px-3 py-1.5",
          className
        )}
        data-testid="suggested-tag-badge-no-suggestion"
      >
        <Tag className="h-4 w-4 text-gray-400" aria-hidden="true" />
        <span className="text-sm text-gray-400">Brak sugestii etykiety</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center space-x-2 rounded-md border border-purple-500/30 bg-purple-500/10 px-3 py-1.5",
        className
      )}
      data-testid="suggested-tag-badge-with-suggestion"
    >
      <Tag className="h-4 w-4 text-purple-300" aria-hidden="true" />
      <span className="text-sm font-medium text-purple-200" data-testid="suggested-tag-badge-tag-name">
        {tagName}
      </span>
    </div>
  );
}
