import { Check, ChevronDown } from "lucide-react";
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
        <Button variant="outline" className="w-full justify-between sm:w-[200px]">
          <span className="truncate">{selectedLabel}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        <DropdownMenuLabel>Status celu</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Clear selection */}
        <DropdownMenuCheckboxItem
          checked={!value}
          onCheckedChange={() => {
            onChange(undefined);
            setOpen(false);
          }}
        >
          <span className="flex w-full items-center justify-between">
            Wszystkie
            {!value && <Check className="h-4 w-4" />}
          </span>
        </DropdownMenuCheckboxItem>

        <DropdownMenuSeparator />

        {/* Status options */}
        {GOAL_STATUS_OPTIONS.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={value === option.value}
            onCheckedChange={() => {
              onChange(option.value);
              setOpen(false);
            }}
          >
            <span className="flex w-full items-center justify-between">
              {option.label}
              {value === option.value && <Check className="h-4 w-4" />}
            </span>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
