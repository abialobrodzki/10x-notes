import { CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GoalStatus } from "@/types";

interface GoalStatusDisplayProps {
  status: GoalStatus;
  className?: string;
}

/**
 * GoalStatusDisplay - Visual indicator for goal achievement status
 * Features:
 * - achieved: green checkmark (✓)
 * - not_achieved: red cross (✗)
 * - undefined: gray question mark (?)
 * - ARIA labels for accessibility
 */
export function GoalStatusDisplay({ status, className }: GoalStatusDisplayProps) {
  const statusConfig = {
    achieved: {
      icon: CheckCircle2,
      label: "Cele osiągnięte",
      color: "text-green-400",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/30",
    },
    not_achieved: {
      icon: XCircle,
      label: "Cele nieosiągnięte",
      color: "text-red-400",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/30",
    },
    undefined: {
      icon: HelpCircle,
      label: "Status celów nieokreślony",
      color: "text-gray-400",
      bgColor: "bg-gray-500/10",
      borderColor: "border-gray-500/30",
    },
  };

  const config = statusConfig[status] || statusConfig.undefined;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "inline-flex items-center space-x-2 rounded-lg border px-3 py-2",
        config.bgColor,
        config.borderColor,
        className
      )}
      role="status"
      aria-label={config.label}
    >
      <Icon className={cn("h-5 w-5", config.color)} aria-hidden="true" />
      <span className={cn("text-sm font-medium", config.color)}>{config.label}</span>
    </div>
  );
}
