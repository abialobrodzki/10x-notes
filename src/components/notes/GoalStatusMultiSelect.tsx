import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { GoalStatus } from "@/types";

interface GoalStatusMultiSelectProps {
  value: GoalStatus | undefined;
  onChange: (value: GoalStatus | undefined) => void;
}

const GOAL_STATUS_OPTIONS: { value: GoalStatus; label: string }[] = [
  { value: "achieved", label: "Osiągnięty" },
  { value: "not_achieved", label: "Nieosiągnięty" },
];

/**
 * GoalStatusMultiSelect - Filter by goal achievement status
 *
 * Features:
 * - Single select (despite the name - per plan it's a filter, not multi)
 * - Clear selection option
 * - Polish labels
 */
export function GoalStatusMultiSelect({ value, onChange }: GoalStatusMultiSelectProps) {
  const NULL_VALUE = "__null__";
  const displayValue = value || NULL_VALUE;
  const selectedLabel = value ? GOAL_STATUS_OPTIONS.find((opt) => opt.value === value)?.label : "Status celu";

  return (
    <Select
      value={displayValue}
      onValueChange={(newValue) => {
        onChange(newValue === NULL_VALUE ? undefined : (newValue as GoalStatus));
      }}
      data-testid="goal-status-multi-select"
    >
      <SelectTrigger data-testid="goal-status-multi-select-trigger">
        <SelectValue placeholder={selectedLabel} data-testid="goal-status-multi-select-value" />
      </SelectTrigger>
      <SelectContent className="dropdown-content-glass" align="start">
        <SelectItem
          value={NULL_VALUE}
          className="dropdown-item-glass"
          data-testid="goal-status-multi-select-all-option"
        >
          Wszystkie
        </SelectItem>
        {GOAL_STATUS_OPTIONS.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="dropdown-item-glass"
            data-testid={`goal-status-multi-select-option-${option.value}`}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
