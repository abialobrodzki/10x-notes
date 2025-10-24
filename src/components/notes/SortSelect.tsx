import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { NotesSortBy, SortOrder } from "@/types";

interface SortSelectProps {
  sortBy: NotesSortBy | undefined;
  order: SortOrder | undefined;
  onSortByChange: (sortBy: NotesSortBy) => void;
  onOrderChange: (order: SortOrder) => void;
}

const SORT_BY_OPTIONS: { value: NotesSortBy; label: string }[] = [
  { value: "meeting_date", label: "Data spotkania" },
  { value: "created_at", label: "Data utworzenia" },
  { value: "updated_at", label: "Data modyfikacji" },
];

const ORDER_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "desc", label: "Malejąco" },
  { value: "asc", label: "Rosnąco" },
];

/**
 * SortSelect - Sort notes by field and order
 *
 * Features:
 * - Two selects: sort field and order
 * - Default: meeting_date desc
 */
export function SortSelect({ sortBy, order, onSortByChange, onOrderChange }: SortSelectProps) {
  const currentSortBy = sortBy || "meeting_date";
  const currentOrder = order || "desc";

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      {/* Sort By Field */}
      <Select value={currentSortBy} onValueChange={(value) => onSortByChange(value as NotesSortBy)}>
        <SelectTrigger className="glass-select w-full border-glass-border bg-gradient-to-b from-glass-bg-from to-glass-bg-to text-glass-text backdrop-blur-xl hover:text-glass-text sm:w-[180px]">
          <SelectValue placeholder="Sortuj według" />
        </SelectTrigger>
        <SelectContent className="border-glass-border bg-gradient-to-b from-glass-bg-from to-glass-bg-to backdrop-blur-xl">
          {SORT_BY_OPTIONS.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="glass-select text-glass-text focus:bg-white/5 focus:text-glass-text"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Sort Order */}
      <Select value={currentOrder} onValueChange={(value) => onOrderChange(value as SortOrder)}>
        <SelectTrigger className="glass-select w-full border-glass-border bg-gradient-to-b from-glass-bg-from to-glass-bg-to text-glass-text backdrop-blur-xl hover:text-glass-text sm:w-[140px]">
          <SelectValue placeholder="Kolejność" />
        </SelectTrigger>
        <SelectContent className="border-glass-border bg-gradient-to-b from-glass-bg-from to-glass-bg-to backdrop-blur-xl">
          {ORDER_OPTIONS.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="glass-select text-glass-text focus:bg-white/5 focus:text-glass-text"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
