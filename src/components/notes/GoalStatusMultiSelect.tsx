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
          className="glass-select w-full justify-between border-glass-border bg-gradient-to-b from-glass-bg-from to-glass-bg-to text-glass-text backdrop-blur-xl hover:text-glass-text"
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[200px] border-glass-border bg-gradient-to-b from-glass-bg-from to-glass-bg-to backdrop-blur-xl"
      >
        <DropdownMenuLabel className="text-glass-text">Status celu</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-glass-border" />

        {/* Clear selection */}
        <DropdownMenuCheckboxItem
          checked={!value}
          onCheckedChange={() => {
            onChange(undefined);
            setOpen(false);
          }}
          className="text-glass-text focus:bg-white/5 focus:text-glass-text"
        >
          Wszystkie
        </DropdownMenuCheckboxItem>

        <DropdownMenuSeparator className="bg-glass-border" />

        {/* Status options */}
        {GOAL_STATUS_OPTIONS.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={value === option.value}
            onCheckedChange={() => {
              onChange(option.value);
              setOpen(false);
            }}
            className="text-glass-text focus:bg-white/5 focus:text-glass-text"
          >
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
