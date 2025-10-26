import { X, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
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
  const [isExpanded, setIsExpanded] = useState(true);

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
      date_from: undefined,
      date_to: undefined,
      goal_status: undefined,
      tag_id: filters.tag_id, // Keep tag filter (from sidebar)
      include_shared: filters.include_shared, // Keep shared notes toggle
    });
  };

  return (
    <div className="space-y-4 rounded-lg border border-glass-border bg-gradient-to-b from-glass-bg-from to-glass-bg-to p-4 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-medium text-glass-text hover-nav"
        >
          <span>Filtry i sortowanie</span>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-8 px-2 text-glass-text-muted hover-nav lg:px-3"
          >
            <X className="mr-2 h-4 w-4" />
            Wyczyść
          </Button>
        )}
      </div>

      {isExpanded && (
        <div className="flex flex-wrap items-start gap-4">
          {/* Date Range */}
          <div className="w-full md:flex-1">
            <div className="mb-2 block text-xs font-medium text-glass-text-muted">Zakres dat</div>
            <DateRangePicker
              dateFrom={filters.date_from}
              dateTo={filters.date_to}
              onDateFromChange={(date_from) => onChange({ ...filters, date_from, page: 1 })}
              onDateToChange={(date_to) => onChange({ ...filters, date_to, page: 1 })}
            />
          </div>

          {/* Goal Status */}
          <div className="w-full md:flex-1">
            <div className="mb-2 block text-xs font-medium text-glass-text-muted">Status celu</div>
            <GoalStatusMultiSelect
              value={filters.goal_status}
              onChange={(goal_status) => onChange({ ...filters, goal_status, page: 1 })}
            />
          </div>

          {/* Sort */}
          <div className="w-full md:flex-1">
            <div className="mb-2 block text-xs font-medium text-glass-text-muted">Sortowanie</div>
            <SortSelect
              sortBy={filters.sort_by}
              order={filters.order}
              onSortByChange={(sort_by) => onChange({ ...filters, sort_by, page: 1 })}
              onOrderChange={(order) => onChange({ ...filters, order, page: 1 })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
