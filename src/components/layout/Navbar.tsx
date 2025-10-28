import { LogOut, Menu, Plus, Settings, User } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { supabaseClient } from "@/db/supabase.client";
import type { UserProfileDTO } from "@/types";

interface NavbarProps {
  /** Whether user is authenticated */
  isAuthenticated: boolean;
}

/**
 * Navbar - Global navigation component
 *
 * Features:
 * - Logo/brand with link to home
 * - User menu dropdown (authenticated users only)
 * - Logout functionality
 * - Responsive design (mobile hamburger menu)
 */
export function Navbar({ isAuthenticated }: NavbarProps) {
  const [userProfile, setUserProfile] = useState<UserProfileDTO | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Fetch user profile when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const fetchProfile = async () => {
      try {
        const response = await fetch("/api/user/profile", {
          credentials: "include",
        });

        if (response.ok) {
          const profile = await response.json();
          setUserProfile(profile);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to fetch user profile:", error);
      }
    };

    fetchProfile();
  }, [isAuthenticated]);

  /**
   * Handle user logout
   * - Sign out from Supabase
   * - Clear local storage
   * - Redirect to landing page
   */
  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      // Sign out from Supabase
      await supabaseClient.auth.signOut();

      // Clear cached data
      localStorage.clear();
      sessionStorage.clear();

      // Show success toast
      toast.success("Wylogowano pomyślnie", {
        duration: 2000,
      });

      // Redirect to landing page
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Logout error:", error);

      toast.error("Błąd podczas wylogowywania", {
        description: "Spróbuj ponownie",
      });

      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-glass-border bg-linear-to-r from-gradient-from/90 via-gradient-via/90 to-gradient-to/90 shadow-lg backdrop-blur-xl">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        {/* Logo/Brand */}
        <a
          href={isAuthenticated ? "/notes" : "/"}
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
        >
          <span className="bg-linear-to-r from-gradient-heading-from via-gradient-heading-via to-gradient-heading-to bg-clip-text text-xl font-bold text-transparent drop-shadow-lg">
            10xNotes
          </span>
        </a>

        {/* Navigation - Authenticated vs Public */}
        {isAuthenticated ? (
          <>
            {/* Authenticated - Desktop Navigation */}
            <nav className="hidden items-center gap-4 md:flex">
              <a href="/notes" className="rounded-lg px-4 py-2 text-sm font-medium text-glass-text hover-nav">
                Moje notatki
              </a>
              <a
                href="/"
                className="flex items-center gap-2 rounded-lg btn-gradient-primary px-4 py-2 text-sm font-medium hover-gradient"
              >
                <Plus className="h-4 w-4" />
                <span>Generuj notatkę</span>
              </a>

              {/* User Menu Dropdown - Email visible next to icon */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-full px-3 py-1.5 text-glass-text hover-nav focus:outline-none focus:ring-2 focus:ring-input-border-focus">
                    <span className="text-sm font-medium">{userProfile?.email || "Ładowanie..."}</span>
                    <User className="h-5 w-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 dropdown-content-glass">
                  <DropdownMenuItem asChild>
                    <a
                      href="/settings"
                      className="flex cursor-pointer items-center gap-2 text-glass-text hover:bg-white/5! hover:text-glass-text-hover! focus:bg-white/5! focus:text-glass-text-hover!"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Ustawienia</span>
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="dropdown-separator-glass" />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="flex cursor-pointer items-center gap-2 text-destructive hover:bg-destructive/10! hover:text-destructive! focus:bg-destructive/10! focus:text-destructive!"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>{isLoggingOut ? "Wylogowywanie..." : "Wyloguj się"}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>

            {/* Mobile Navigation */}
            <div className="flex items-center gap-3 md:hidden">
              {/* Email visible on mobile */}
              <span className="text-sm font-medium text-glass-text">{userProfile?.email || "..."}</span>

              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-glass-text hover-nav">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-64 dropdown-content-glass">
                  <div className="flex flex-col gap-4 py-4">
                    {/* Navigation Links */}
                    <a
                      href="/notes"
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-glass-text hover-nav"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Moje notatki
                    </a>

                    <a
                      href="/"
                      className="flex items-center gap-2 rounded-lg btn-gradient-primary px-3 py-2 text-sm font-medium hover-gradient"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Plus className="h-4 w-4" />
                      Generuj notatkę
                    </a>

                    <a
                      href="/settings"
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-glass-text hover-nav"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Settings className="h-4 w-4" />
                      Ustawienia
                    </a>

                    <div className="my-2 h-px bg-glass-border" />

                    {/* Logout Button */}
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        handleLogout();
                      }}
                      disabled={isLoggingOut}
                      className="interactive-destructive flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium"
                    >
                      <LogOut className="h-4 w-4" />
                      {isLoggingOut ? "Wylogowywanie..." : "Wyloguj się"}
                    </button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </>
        ) : (
          <>
            {/* Public - Desktop Navigation */}
            <nav className="hidden items-center gap-4 md:flex">
              <a href="/login" className="rounded-lg px-4 py-2 text-sm font-medium text-glass-text hover-nav">
                Zaloguj się
              </a>
              <a
                href="/register"
                className="rounded-lg btn-gradient-primary px-4 py-2 text-sm font-medium hover-gradient"
              >
                Zarejestruj się
              </a>
            </nav>

            {/* Public - Mobile Navigation */}
            <div className="flex items-center gap-3 md:hidden">
              <a href="/login" className="rounded-lg px-3 py-1.5 text-sm font-medium text-glass-text hover-nav">
                Zaloguj
              </a>
              <a
                href="/register"
                className="rounded-lg btn-gradient-primary px-3 py-1.5 text-sm font-medium hover-gradient"
              >
                Rejestracja
              </a>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
