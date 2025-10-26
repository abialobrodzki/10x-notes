import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { NotesSortBy, SortOrder } from "@/types";

interface SortSelectProps {
  sortBy: NotesSortBy | undefined;
  order: SortOrder | undefined;
  onSortByChange: (sortBy: NotesSortBy) => void;
  onOrderChange: (order: SortOrder) => void;
}

const ORDER_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "desc", label: "Od najnowszych" },
  { value: "asc", label: "Od najstarszych" },
];

/**
 * SortSelect - Sort notes by field and order
 *
 * Features:
 * - Two selects: sort field and order
 * - Default: meeting_date desc
 */
export function SortSelect({ order, onOrderChange }: SortSelectProps) {
  const currentOrder = order || "desc";

  return (
    <Select value={currentOrder} onValueChange={(value) => onOrderChange(value as SortOrder)}>
      <SelectTrigger>
        <SelectValue placeholder="Kolejność" />
      </SelectTrigger>
      <SelectContent className="dropdown-content-glass">
        {ORDER_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value} className="glass-select dropdown-item-glass">
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
