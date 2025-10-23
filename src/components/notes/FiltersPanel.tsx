import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "./DateRangePicker";
import { GoalStatusMultiSelect } from "./GoalStatusMultiSelect";
import { SortSelect } from "./SortSelect";
import type { NotesListQuery } from "@/types";

interface FiltersPanelProps {
  filters: NotesListQuery;
  onChange: (filters: NotesListQuery) => void;
}

/**
 * FiltersPanel - Manage filtering and sorting of notes
 *
 * Features:
 * - Date range picker (date_from, date_to)
 * - Goal status filter
 * - Sort by field and order
 * - Reset all filters button
 * - Syncs with URL on change
 */
export function FiltersPanel({ filters, onChange }: FiltersPanelProps) {
  const hasActiveFilters =
    filters.date_from ||
    filters.date_to ||
    filters.goal_status ||
    filters.sort_by !== "meeting_date" ||
    filters.order !== "desc";

  const handleReset = () => {
    onChange({
      page: 1,
      limit: filters.limit,
      sort_by: "meeting_date",
      order: "desc",
    });
  };

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Filtry i sortowanie</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleReset} className="h-8 px-2 lg:px-3">
            <X className="mr-2 h-4 w-4" />
            Wyczyść
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {/* Date Range */}
        <div>
          <div className="mb-2 block text-xs font-medium text-muted-foreground">Zakres dat</div>
          <DateRangePicker
            dateFrom={filters.date_from}
            dateTo={filters.date_to}
            onDateFromChange={(date_from) => onChange({ ...filters, date_from, page: 1 })}
            onDateToChange={(date_to) => onChange({ ...filters, date_to, page: 1 })}
          />
        </div>

        {/* Goal Status */}
        <div>
          <div className="mb-2 block text-xs font-medium text-muted-foreground">Status celu</div>
          <GoalStatusMultiSelect
            value={filters.goal_status}
            onChange={(goal_status) => onChange({ ...filters, goal_status, page: 1 })}
          />
        </div>

        {/* Sort */}
        <div>
          <div className="mb-2 block text-xs font-medium text-muted-foreground">Sortowanie</div>
          <SortSelect
            sortBy={filters.sort_by}
            order={filters.order}
            onSortByChange={(sort_by) => onChange({ ...filters, sort_by, page: 1 })}
            onOrderChange={(order) => onChange({ ...filters, order, page: 1 })}
          />
        </div>
      </div>
    </div>
  );
}
