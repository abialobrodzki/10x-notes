import { useLogout } from "@/components/hooks/useLogout";
import { useUserProfile } from "@/components/hooks/useUserProfile";
import { AuthenticatedNav } from "./AuthenticatedNav";
import { PublicNav } from "./PublicNav";

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
 * Uses custom hooks and child components for better organization
 */
export function Navbar({ isAuthenticated }: NavbarProps) {
  // Fetch user profile
  const { userProfile } = useUserProfile(isAuthenticated);

  // Manage logout
  const { logout, isLoggingOut } = useLogout();

  return (
    <header
      className="sticky top-0 z-50 w-full border-b border-glass-border bg-linear-to-r from-gradient-from/90 via-gradient-via/90 to-gradient-to/90 shadow-lg backdrop-blur-xl"
      data-testid="navbar"
    >
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        {/* Logo/Brand */}
        <a
          href={isAuthenticated ? "/notes" : "/"}
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
          data-testid="navbar-logo-link"
        >
          <span className="bg-linear-to-r from-gradient-heading-from via-gradient-heading-via to-gradient-heading-to bg-clip-text text-xl font-bold text-transparent drop-shadow-lg">
            10xNotes
          </span>
        </a>

        {/* Navigation - Authenticated vs Public */}
        {isAuthenticated ? (
          <AuthenticatedNav userProfile={userProfile} isLoggingOut={isLoggingOut} onLogout={logout} />
        ) : (
          <PublicNav />
        )}
      </div>
    </header>
  );
}
