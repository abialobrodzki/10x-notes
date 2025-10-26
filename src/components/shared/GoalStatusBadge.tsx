import { CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { GoalStatus } from "@/types";

interface GoalStatusBadgeProps {
  status: GoalStatus | null;
  /** Optional className for additional styling */
  className?: string;
  /** Show icon next to label (default: true) */
  showIcon?: boolean;
}

/**
 * GoalStatusBadge - Unified badge component for goal achievement status
 *
 * Used across the entire app for consistent status display:
 * - Landing page (AI generation result)
 * - Note list items
 * - Note detail page
 * - Public note view
 *
 * Features:
 * - Consistent labels: "Osiągnięty" / "Nieosiągnięty" / "Nieokreślony"
 * - Global status color tokens from global.css
 * - Optional icon display
 * - Proper ARIA labels for accessibility
 */
export function GoalStatusBadge({ status, className = "", showIcon = true }: GoalStatusBadgeProps) {
  // Don't render if no status
  if (!status) {
    return null;
  }

  const config = {
    achieved: {
      icon: CheckCircle2,
      label: "Osiągnięty",
      ariaLabel: "Status celu: osiągnięty",
      className: "bg-status-success-bg text-status-success-text border-status-success-border",
    },
    not_achieved: {
      icon: XCircle,
      label: "Nieosiągnięty",
      ariaLabel: "Status celu: nieosiągnięty",
      className: "bg-status-error-bg text-status-error-text border-status-error-border",
    },
    undefined: {
      icon: HelpCircle,
      label: "Nieokreślony",
      ariaLabel: "Status celu: nieokreślony",
      className: "bg-status-neutral-bg text-status-neutral-text border-status-neutral-border",
    },
  }[status];

  const Icon = config.icon;

  return (
    <Badge
      className={`inline-flex items-center gap-1.5 ${config.className} ${className}`}
      role="status"
      aria-label={config.ariaLabel}
    >
      {showIcon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
      <span>{config.label}</span>
    </Badge>
  );
}
