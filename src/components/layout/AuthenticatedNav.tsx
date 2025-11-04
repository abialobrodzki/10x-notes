import { Plus } from "lucide-react";
import { MobileMenu } from "./MobileMenu";
import { UserMenu } from "./UserMenu";
import type { UserProfileDTO } from "@/types";

interface AuthenticatedNavProps {
  userProfile: UserProfileDTO | null;
  isLoggingOut: boolean;
  onLogout: () => Promise<void>;
}

/**
 * AuthenticatedNav - Navigation for authenticated users
 * Shows navigation links, generate note button, user menu, and mobile menu
 */
export function AuthenticatedNav({ userProfile, isLoggingOut, onLogout }: AuthenticatedNavProps) {
  return (
    <>
      {/* Authenticated - Desktop Navigation */}
      <nav className="hidden items-center gap-4 md:flex">
        <a
          href="/notes"
          className="rounded-lg px-4 py-2 text-sm font-medium text-glass-text hover-nav"
          data-testid="navbar-notes-link"
        >
          Moje notatki
        </a>
        <a
          href="/"
          className="flex items-center gap-2 rounded-lg btn-gradient-primary px-4 py-2 text-sm font-medium hover-gradient"
          data-testid="navbar-generate-note-button"
        >
          <Plus className="h-4 w-4" />
          <span>Generuj notatkę</span>
        </a>

        {/* User Menu Dropdown */}
        <UserMenu userProfile={userProfile} isLoggingOut={isLoggingOut} onLogout={onLogout} />
      </nav>

      {/* Mobile Navigation */}
      <MobileMenu userProfile={userProfile} isLoggingOut={isLoggingOut} onLogout={onLogout} />
    </>
  );
}
