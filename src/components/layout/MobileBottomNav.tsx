import { BookOpen, Plus, Settings } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

/**
 * MobileBottomNav - Bottom navigation bar for mobile devices
 * Displays 3 main navigation buttons: Notes, Generate, Settings
 * Only visible on mobile (hidden on md+ screens)
 *
 * WCAG compliance:
 * - Minimum touch target: 44x44px
 * - aria-label for each button
 * - aria-current="page" for active link
 * - Full keyboard navigation support (Tab, Enter)
 */
export function MobileBottomNav() {
  const [pathname, setPathname] = useState<string>("");

  // Update pathname on mount and route changes
  useEffect(() => {
    setPathname(window.location.pathname);

    // Listen for navigation changes
    const handleNavigate = () => {
      setPathname(window.location.pathname);
    };

    window.addEventListener("popstate", handleNavigate);
    document.addEventListener("astro:page-load", handleNavigate);

    return () => {
      window.removeEventListener("popstate", handleNavigate);
      document.removeEventListener("astro:page-load", handleNavigate);
    };
  }, []);

  // Determine active link based on pathname
  const isActive = useCallback(
    (href: string) => {
      if (href === "/" && pathname === "/") return true;
      // Handle /settings specifically to also match /settings/
      if (href === "/settings" && (pathname === "/settings" || pathname.startsWith("/settings/"))) return true;
      if (href !== "/" && href !== "/settings" && pathname.startsWith(href)) return true;
      return false;
    },
    [pathname]
  );

  const navigationItems = [
    {
      href: "/notes",
      label: "Moje Notatki",
      icon: BookOpen,
      ariaLabel: "Przejdź do listy moich notatek",
    },
    {
      href: "/",
      label: "Generuj",
      icon: Plus,
      ariaLabel: "Przejdź do generatora notatek",
    },
    {
      href: "/settings",
      label: "Ustawienia",
      icon: Settings,
      ariaLabel: "Przejdź do ustawień",
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 border-t border-white/20 bg-linear-to-r from-gradient-from/85 via-gradient-via/85 to-gradient-to/85 shadow-lg backdrop-blur-xl md:hidden"
      aria-label="Główna nawigacja mobilna"
      data-testid="mobile-bottom-nav"
    >
      <div className="flex h-16 items-center justify-around gap-1 px-2">
        {navigationItems.map(({ href, label, icon: Icon, ariaLabel }) => {
          const active = isActive(href);

          // Regular navigation links
          return (
            <a
              key={label}
              href={href}
              aria-label={ariaLabel}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-2 py-1 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/40 ${
                active ? "bg-white/20 drop-shadow-md" : "hover:bg-white/10"
              }`}
              data-testid={`mobile-nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <Icon
                className="h-5 w-5"
                style={{
                  color: active ? "var(--gradient-heading-from)" : "oklch(0.70 0.059 254.128)",
                }}
              />
              <span
                className="text-xs font-semibold leading-none bg-clip-text text-transparent"
                style={{
                  backgroundImage: active
                    ? "linear-gradient(to right, var(--gradient-heading-from), var(--gradient-heading-via), var(--gradient-heading-to))"
                    : "linear-gradient(to right, oklch(0.70 0.059 254.128), oklch(0.72 0.063 306.703), oklch(0.70 0.061 343.231))",
                }}
              >
                {label}
              </span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
