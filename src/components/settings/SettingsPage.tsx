import { User, BarChart3, Shield, AlertTriangle, ArrowLeft } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import AlertArea from "@/components/AlertArea";
import { GlassCard } from "@/components/ui/composed/GlassCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DangerZone } from "./DangerZone";
import { ProfileSection } from "./ProfileSection";
import { StatsSection } from "./StatsSection";
import type { UserProfileDTO, UserStatsDTO } from "@/types";

interface SettingsPageProps {
  initialProfile: UserProfileDTO | null;
  initialStats: UserStatsDTO | null;
  initialError: string | null;
}

/**
 * SettingsPage component
 * Main container for user settings view
 * Manages tabs and sections: Profile, Stats, Security, Danger Zone
 */
export function SettingsPage({ initialProfile, initialStats, initialError }: SettingsPageProps) {
  const [errors] = useState<string[]>(initialError ? [initialError] : []);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Force scroll initialization on mount (Safari fix)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Force reflow and wake up Safari scroll
    requestAnimationFrame(() => {
      void container.offsetHeight; // Force reflow
      container.scrollTop = 1;
      requestAnimationFrame(() => {
        container.scrollTop = 0;
      });
    });
  }, []);

  // Don't render content if there's an error or missing data
  if (errors.length > 0 || !initialProfile || !initialStats) {
    return (
      <div
        ref={scrollContainerRef}
        className="h-full overflow-auto bg-gradient-to-br from-gradient-from via-gradient-via to-gradient-to p-4 sm:p-8"
      >
        <div className="mx-auto max-w-4xl">
          <GlassCard padding="lg">
            <h1 className="mb-6 bg-gradient-to-r from-gradient-heading-from via-gradient-heading-via to-gradient-heading-to bg-clip-text text-3xl font-bold text-transparent drop-shadow-lg">
              Ustawienia
            </h1>
            <AlertArea messages={errors} />
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      className="h-full overflow-auto bg-gradient-to-br from-gradient-from via-gradient-via to-gradient-to p-4 sm:p-8"
    >
      <div className="mx-auto max-w-6xl">
        <GlassCard padding="lg">
          {/* Breadcrumb */}
          <nav className="mb-6" aria-label="Breadcrumb">
            <a href="/notes" className="inline-flex items-center gap-2 text-sm text-glass-text-muted hover-link">
              <ArrowLeft className="h-4 w-4" />
              Powrót do notatek
            </a>
          </nav>

          {/* Header */}
          <div className="mb-8">
            <h1 className="mb-2 bg-gradient-to-r from-gradient-heading-from via-gradient-heading-via to-gradient-heading-to bg-clip-text text-3xl font-bold text-transparent drop-shadow-lg">
              Ustawienia
            </h1>
            <p className="text-glass-text-muted drop-shadow-md">
              Zarządzaj swoim profilem, przeglądaj statystyki i ustawienia konta
            </p>
          </div>

          {/* Tabs Navigation */}
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 bg-gradient-to-b from-glass-bg-from to-glass-bg-to border border-glass-border backdrop-blur-lg p-1 h-auto">
              <TabsTrigger
                value="profile"
                className="flex items-center gap-2 text-glass-text-muted hover-nav data-[state=active]:text-glass-text data-[state=active]:bg-gradient-to-b data-[state=active]:from-glass-bg-from data-[state=active]:to-glass-bg-to data-[state=active]:border-glass-border data-[state=active]:shadow-lg transition-all"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Profil</span>
              </TabsTrigger>
              <TabsTrigger
                value="stats"
                className="flex items-center gap-2 text-glass-text-muted hover-nav data-[state=active]:text-glass-text data-[state=active]:bg-gradient-to-b data-[state=active]:from-glass-bg-from data-[state=active]:to-glass-bg-to data-[state=active]:border-glass-border data-[state=active]:shadow-lg transition-all"
              >
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Statystyki</span>
              </TabsTrigger>
              <TabsTrigger
                value="security"
                className="flex items-center gap-2 text-glass-text-muted data-[state=active]:text-glass-text data-[state=active]:bg-gradient-to-b data-[state=active]:from-glass-bg-from data-[state=active]:to-glass-bg-to data-[state=active]:border-glass-border data-[state=active]:shadow-lg transition-all opacity-50"
                disabled
              >
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Bezpieczeństwo</span>
              </TabsTrigger>
              <TabsTrigger
                value="danger"
                className="flex items-center gap-2 text-glass-text-muted hover-nav data-[state=active]:text-glass-text data-[state=active]:bg-gradient-to-b data-[state=active]:from-glass-bg-from data-[state=active]:to-glass-bg-to data-[state=active]:border-glass-border data-[state=active]:shadow-lg transition-all"
              >
                <AlertTriangle className="h-4 w-4" />
                <span className="hidden sm:inline">Strefa zagrożeń</span>
              </TabsTrigger>
            </TabsList>

            {/* Profile Section */}
            <TabsContent value="profile" className="space-y-6">
              <ProfileSection profile={initialProfile} />
            </TabsContent>

            {/* Stats Section */}
            <TabsContent value="stats" className="space-y-6">
              <StatsSection stats={initialStats} />
            </TabsContent>

            {/* Security Section - Coming Soon */}
            <TabsContent value="security" className="space-y-6">
              <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                <Shield className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <h3 className="mb-2 text-lg font-semibold">Wkrótce dostępne</h3>
                <p>Sekcja bezpieczeństwa jest obecnie w fazie rozwoju.</p>
              </div>
            </TabsContent>

            {/* Danger Zone */}
            <TabsContent value="danger" className="space-y-6">
              <DangerZone userEmail={initialProfile.email} />
            </TabsContent>
          </Tabs>
        </GlassCard>
      </div>
    </div>
  );
}
