import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

type BadgeStatus = "success" | "error" | "neutral";

interface StatusBadgeProps extends Omit<ComponentProps<"span">, "className"> {
  status: BadgeStatus;
}

/**
 * Status badge with predefined color schemes
 * Uses design tokens from global.css (--status-*)
 *
 * @example
 * <StatusBadge status="success">Completed</StatusBadge>
 * <StatusBadge status="error">Failed</StatusBadge>
 */
export function StatusBadge({ status, children, ...props }: StatusBadgeProps) {
  const variants = {
    success:
      "bg-status-success-bg text-status-success-text border-status-success-border hover:bg-status-success-bg-hover hover:border-status-success-border-hover",
    error:
      "bg-status-error-bg text-status-error-text border-status-error-border hover:bg-status-error-bg-hover hover:border-status-error-border-hover",
    neutral:
      "bg-status-neutral-bg text-status-neutral-text border-status-neutral-border hover:bg-status-neutral-bg-hover hover:border-status-neutral-border-hover",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all",
        variants[status]
      )}
      {...props}
    >
      {children}
    </span>
  );
}
