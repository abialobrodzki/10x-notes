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
 * Three states: achieved (✓), not_achieved (✗), undefined (?)
 * Features:
 * - Colorful icons (green, red, gray)
 * - Optimistic updates with rollback on error
 * - Disabled for non-owners
 * - Full accessibility support
 */
export default function GoalStatusRadio({ value, isOwner, onChange, isSaving }: GoalStatusRadioProps) {
  const groupId = useId();
  const achievedId = `${groupId}-achieved`;
  const notAchievedId = `${groupId}-not-achieved`;
  const undefinedId = `${groupId}-undefined`;

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
      label: "Osiągnięto",
      icon: (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      ),
      colorClasses:
        "border-green-400/30 bg-green-500/20 text-green-100 hover:border-green-400/50 hover:bg-green-500/30",
      selectedClasses: "border-green-400 bg-green-500/40",
    },
    {
      id: notAchievedId,
      value: "not_achieved" as const,
      label: "Nieosiągnięto",
      icon: (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
      ),
      colorClasses: "border-red-400/30 bg-red-500/20 text-red-100 hover:border-red-400/50 hover:bg-red-500/30",
      selectedClasses: "border-red-400 bg-red-500/40",
    },
    {
      id: undefinedId,
      value: null,
      label: "Nieokreślono",
      icon: (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
      ),
      colorClasses: "border-gray-400/30 bg-gray-500/20 text-gray-100 hover:border-gray-400/50 hover:bg-gray-500/30",
      selectedClasses: "border-gray-400 bg-gray-500/40",
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
              <div className="flex-shrink-0">{option.icon}</div>

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
