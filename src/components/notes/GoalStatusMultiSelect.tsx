import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { GoalStatus } from "@/types";

interface GoalStatusMultiSelectProps {
  value: GoalStatus | undefined;
  onChange: (value: GoalStatus | undefined) => void;
}

const GOAL_STATUS_OPTIONS: { value: GoalStatus; label: string }[] = [
  { value: "achieved", label: "Osiągnięty" },
  { value: "not_achieved", label: "Nieosiągnięty" },
  { value: "undefined", label: "Nieokreślony" },
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
  const [open, setOpen] = useState(false);

  const selectedLabel = value ? GOAL_STATUS_OPTIONS.find((opt) => opt.value === value)?.label : "Status celu";

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="glass-select dropdown-glass-base w-full justify-between hover:text-glass-text"
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px] dropdown-content-glass">
        <DropdownMenuLabel className="dropdown-label-glass">Status celu</DropdownMenuLabel>
        <DropdownMenuSeparator className="dropdown-separator-glass" />

        {/* Clear selection */}
        <DropdownMenuCheckboxItem
          checked={!value}
          onCheckedChange={() => {
            onChange(undefined);
            setOpen(false);
          }}
          className="dropdown-item-glass"
        >
          Wszystkie
        </DropdownMenuCheckboxItem>

        <DropdownMenuSeparator className="dropdown-separator-glass" />

        {/* Status options */}
        {GOAL_STATUS_OPTIONS.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={value === option.value}
            onCheckedChange={() => {
              onChange(option.value);
              setOpen(false);
            }}
            className="dropdown-item-glass"
          >
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
