import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

type GlassInputProps = ComponentProps<typeof Input>;

/**
 * Input with glass effect styling
 * Wrapper around base Input component with glass background
 *
 * @example
 * <GlassInput placeholder="Search..." />
 */
export function GlassInput({ className, ...props }: GlassInputProps) {
  return (
    <Input
      className={cn("bg-input-bg border-input-border text-input-text placeholder:text-input-placeholder", className)}
      {...props}
    />
  );
}
