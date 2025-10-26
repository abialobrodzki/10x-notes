import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

interface NavLinkProps extends Omit<ComponentProps<"a">, "className"> {
  active?: boolean;
}

/**
 * Navigation link with glass hover effect
 *
 * @example
 * <NavLink href="/notes" active={pathname === "/notes"}>Notes</NavLink>
 */
export function NavLink({ active = false, children, ...props }: NavLinkProps) {
  return (
    <a
      className={cn(
        "rounded-lg px-4 py-2 text-sm font-medium text-glass-text hover-nav transition-colors",
        active && "bg-white/10"
      )}
      {...props}
    >
      {children}
    </a>
  );
}
