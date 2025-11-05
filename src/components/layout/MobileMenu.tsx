import { BookOpen, LogOut, Menu, Plus, Settings } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { UserProfileDTO } from "@/types";

interface MobileMenuProps {
  userProfile: UserProfileDTO | null;
  isLoggingOut: boolean;
  onLogout: () => Promise<void>;
}

/**
 * MobileMenu - Mobile navigation menu for authenticated user
 * Displayed as a Sheet on mobile devices
 */
export function MobileMenu({ userProfile, isLoggingOut, onLogout }: MobileMenuProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex items-center gap-3 md:hidden">
      {/* Email visible on mobile */}
      <span className="text-sm font-medium text-glass-text">{userProfile?.email || "..."}</span>

      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-glass-text hover-nav"
            data-testid="navbar-mobile-menu-button"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-64 dropdown-content-glass" data-testid="navbar-mobile-menu-content">
          <div className="flex flex-col gap-4 py-4">
            {/* Navigation Links */}
            <a
              href="/notes"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-glass-text hover-nav"
              onClick={() => setIsMobileMenuOpen(false)}
              data-testid="navbar-mobile-notes-link"
            >
              <BookOpen className="h-4 w-4" />
              Moje notatki
            </a>

            <a
              href="/"
              className="flex items-center gap-2 rounded-lg btn-gradient-primary px-3 py-2 text-sm font-medium hover-gradient"
              onClick={() => setIsMobileMenuOpen(false)}
              data-testid="navbar-mobile-generate-note-link"
            >
              <Plus className="h-4 w-4" />
              Generuj notatkę
            </a>

            <a
              href="/settings"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-glass-text hover-nav"
              onClick={() => setIsMobileMenuOpen(false)}
              data-testid="navbar-mobile-settings-link"
            >
              <Settings className="h-4 w-4" />
              Ustawienia
            </a>

            <div className="my-2 h-px bg-glass-border" />

            {/* Logout Button */}
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onLogout();
              }}
              disabled={isLoggingOut}
              className="flex cursor-pointer items-center gap-2 text-destructive hover:bg-destructive/10! hover:text-destructive! focus:bg-destructive/10! focus:text-destructive! rounded-lg px-3 py-2 text-sm font-medium"
              data-testid="navbar-mobile-logout-button"
            >
              <LogOut className="h-4 w-4" />
              {isLoggingOut ? "Wylogowywanie..." : "Wyloguj się"}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
