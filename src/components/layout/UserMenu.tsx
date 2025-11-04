import { LogOut, Settings, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UserProfileDTO } from "@/types";

interface UserMenuProps {
  userProfile: UserProfileDTO | null;
  isLoggingOut: boolean;
  onLogout: () => Promise<void>;
}

/**
 * UserMenu - Dropdown menu for authenticated user
 * Shows email, settings link, and logout button
 */
export function UserMenu({ userProfile, isLoggingOut, onLogout }: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-full px-3 py-1.5 text-glass-text hover-nav focus:outline-none focus:ring-2 focus:ring-input-border-focus"
          data-testid="navbar-user-email-display"
        >
          <span className="text-sm font-medium">{userProfile?.email || "Ładowanie..."}</span>
          <User className="h-5 w-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 dropdown-content-glass" data-testid="navbar-user-menu-dropdown">
        <DropdownMenuItem asChild>
          <a
            href="/settings"
            className="flex cursor-pointer items-center gap-2 text-glass-text hover:bg-white/5! hover:text-glass-text-hover! focus:bg-white/5! focus:text-glass-text-hover!"
            data-testid="navbar-settings-link"
          >
            <Settings className="h-4 w-4" />
            <span>Ustawienia</span>
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="dropdown-separator-glass" />
        <DropdownMenuItem
          onClick={onLogout}
          disabled={isLoggingOut}
          className="flex cursor-pointer items-center gap-2 text-destructive hover:bg-destructive/10! hover:text-destructive! focus:bg-destructive/10! focus:text-destructive!"
          data-testid="navbar-logout-button"
        >
          <LogOut className="h-4 w-4" />
          <span>{isLoggingOut ? "Wylogowywanie..." : "Wyloguj się"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
