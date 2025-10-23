import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base shadow-xs outline-none md:text-sm",
        "bg-transparent transition-[color,box-shadow]",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "dark:bg-input/30",
        className,
        // Focus and invalid states - AFTER className to ensure they take priority
        "focus-visible:border-input-border-focus focus-visible:ring-2 focus-visible:ring-input-ring",
        "aria-invalid:border-input-border-error aria-invalid:ring-2 aria-invalid:ring-input-ring-error"
      )}
      {...props}
    />
  );
}

export { Input };
