import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

interface GlassCardProps extends ComponentProps<"div"> {
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

/**
 * Glass-styled card container with optional hover effect
 *
 * @example
 * <GlassCard hover padding="lg">Content</GlassCard>
 * <GlassCard className="cursor-pointer" onClick={...}>Clickable card</GlassCard>
 */
export function GlassCard({ hover = false, padding = "md", className, children, ...props }: GlassCardProps) {
  const paddingClasses = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-glass-border bg-linear-to-b from-glass-bg-from to-glass-bg-to backdrop-blur-xl",
        hover && "hover-glass",
        paddingClasses[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
