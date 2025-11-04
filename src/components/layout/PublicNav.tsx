/**
 * PublicNav - Navigation for non-authenticated users
 * Shows login and register links
 */
export function PublicNav() {
  return (
    <>
      {/* Public - Desktop Navigation */}
      <nav className="hidden items-center gap-4 md:flex">
        <a
          href="/login"
          className="rounded-lg px-4 py-2 text-sm font-medium text-glass-text hover-nav"
          data-testid="navbar-login-link"
        >
          Zaloguj się
        </a>
        <a
          href="/register"
          className="rounded-lg btn-gradient-primary px-4 py-2 text-sm font-medium hover-gradient"
          data-testid="navbar-register-link"
        >
          Zarejestruj się
        </a>
      </nav>

      {/* Public - Mobile Navigation */}
      <div className="flex items-center gap-3 md:hidden">
        <a
          href="/login"
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-glass-text hover-nav"
          data-testid="navbar-mobile-login-link"
        >
          Zaloguj
        </a>
        <a
          href="/register"
          className="rounded-lg btn-gradient-primary px-3 py-1.5 text-sm font-medium hover-gradient"
          data-testid="navbar-mobile-register-link"
        >
          Rejestracja
        </a>
      </div>
    </>
  );
}
