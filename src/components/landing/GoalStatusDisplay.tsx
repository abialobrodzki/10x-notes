import { GoalStatusBadge } from "@/components/shared/GoalStatusBadge";
import type { GoalStatus } from "@/types";

interface GoalStatusDisplayProps {
  status: GoalStatus;
  className?: string;
}

/**
 * GoalStatusDisplay - Wrapper for unified GoalStatusBadge
 * @deprecated Use GoalStatusBadge directly instead
 */
export function GoalStatusDisplay({ status, className }: GoalStatusDisplayProps) {
  return <GoalStatusBadge status={status} className={className} showIcon data-testid="goal-status-display" />;
}
