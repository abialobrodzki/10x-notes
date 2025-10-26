import { CheckCircle2, XCircle } from "lucide-react";
import { useId } from "react";
import { Label } from "@/components/ui/label";
import type { GoalStatus } from "@/types";

interface GoalStatusRadioProps {
  value: GoalStatus | null;
  isOwner: boolean;
  onChange: (status: GoalStatus | null) => Promise<void>;
  isSaving: boolean;
}

/**
 * GoalStatusRadio - Radio group for goal achievement status
 * Two states: achieved (✓), not_achieved (✗)
 * Features:
 * - Colorful badges matching NoteListItem styles (green, red)
 * - Optimistic updates with rollback on error
 * - Disabled for non-owners
 * - Full accessibility support
 */
export default function GoalStatusRadio({ value, isOwner, onChange, isSaving }: GoalStatusRadioProps) {
  const groupId = useId();
  const achievedId = `${groupId}-achieved`;
  const notAchievedId = `${groupId}-not-achieved`;

  const handleChange = async (newStatus: GoalStatus | null) => {
    if (!isOwner || isSaving) {
      return;
    }

    try {
      await onChange(newStatus);
    } catch (error) {
      // Error handled by parent with rollback
      // eslint-disable-next-line no-console
      console.error("Failed to update goal status:", error);
    }
  };

  const options = [
    {
      id: achievedId,
      value: "achieved" as const,
      label: "Osiągnięty",
      Icon: CheckCircle2,
      iconColor: "text-status-success-text",
      colorClasses:
        "border-status-success-border bg-gradient-to-b from-glass-bg-from to-glass-bg-to backdrop-blur-xl text-status-success-text hover:border-status-success-border-hover hover:from-glass-bg-to hover:to-glass-bg-from",
      selectedClasses:
        "border-status-success-border-selected bg-gradient-to-b from-status-success-bg to-status-success-bg/50 backdrop-blur-xl text-status-success-text",
    },
    {
      id: notAchievedId,
      value: "not_achieved" as const,
      label: "Nieosiągnięty",
      Icon: XCircle,
      iconColor: "text-status-error-text",
      colorClasses:
        "border-status-error-border bg-gradient-to-b from-glass-bg-from to-glass-bg-to backdrop-blur-xl text-status-error-text hover:border-status-error-border-hover hover:from-glass-bg-to hover:to-glass-bg-from",
      selectedClasses:
        "border-status-error-border-selected bg-gradient-to-b from-status-error-bg to-status-error-bg/50 backdrop-blur-xl text-status-error-text",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Section header */}
      <h3 className="bg-gradient-to-r from-gradient-heading-from to-purple-200 bg-clip-text text-lg font-semibold text-transparent">
        Status celów
      </h3>

      {/* Radio group */}
      <div role="radiogroup" aria-label="Status osiągnięcia celów" className="space-y-2">
        {options.map((option) => {
          const isSelected = value === option.value;
          const isDisabled = !isOwner || isSaving;

          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-labelledby={`${option.id}-label`}
              disabled={isDisabled}
              onClick={() => handleChange(option.value)}
              className={`flex w-full items-center gap-3 rounded-lg border p-3 transition-all ${
                isSelected ? option.selectedClasses : option.colorClasses
              } ${isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
            >
              {/* Radio indicator */}
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                  isSelected ? "border-current bg-current" : "border-current bg-transparent"
                }`}
                aria-hidden="true"
              >
                {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
              </div>

              {/* Icon */}
              <option.Icon className={`h-5 w-5 flex-shrink-0 ${option.iconColor}`} aria-hidden="true" />

              {/* Label */}
              <Label
                id={`${option.id}-label`}
                htmlFor={option.id}
                className="flex-1 cursor-pointer text-left font-medium"
              >
                {option.label}
              </Label>
            </button>
          );
        })}
      </div>

      {/* Loading indicator */}
      {isSaving && <p className="text-sm text-glass-text-muted">Zapisywanie...</p>}
    </div>
  );
}
