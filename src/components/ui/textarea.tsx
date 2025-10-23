import * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-md border px-3 py-2 text-base shadow-xs outline-none md:text-sm",
        "bg-transparent transition-[color,box-shadow]",
        "placeholder:text-muted-foreground",
        "disabled:cursor-not-allowed disabled:opacity-50",
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

export { Textarea };
