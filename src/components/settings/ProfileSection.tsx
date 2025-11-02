import { User, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GlassCard } from "@/components/ui/composed/GlassCard";
import { Label } from "@/components/ui/label";
import type { UserProfileDTO } from "@/types";

interface ProfileSectionProps {
  profile: UserProfileDTO;
}

/**
 * ProfileSection component
 * Displays user email and account creation date (read-only)
 */
export function ProfileSection({ profile }: ProfileSectionProps) {
  // Format creation date for display (YYYY-MM-DD HH:MM)
  const createdDate = new Date(profile.created_at);
  const formattedDate = createdDate.toLocaleString("pl-PL", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Card
      className="bg-linear-to-b from-glass-bg-from to-glass-bg-to border-glass-border backdrop-blur-xl shadow-lg"
      data-testid="profile-section"
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-glass-text">
          <User className="h-5 w-5" />
          Profil użytkownika
        </CardTitle>
        <CardDescription className="text-glass-text-muted">Podstawowe informacje o Twoim koncie</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Email field */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-glass-text">
            Adres e-mail
          </Label>
          <GlassCard padding="sm" className="rounded-md">
            <div
              id="email"
              className="text-sm text-glass-text"
              aria-readonly="true"
              data-testid="profile-section-email"
            >
              {profile.email}
            </div>
          </GlassCard>
        </div>

        {/* Account creation date */}
        <div className="space-y-2">
          <Label htmlFor="created-at" className="text-sm font-medium flex items-center gap-2 text-glass-text">
            <Calendar className="h-4 w-4" />
            Data utworzenia konta
          </Label>
          <GlassCard padding="sm" className="rounded-md">
            <div
              id="created-at"
              className="text-sm text-glass-text"
              aria-readonly="true"
              data-testid="profile-section-created-date"
            >
              {formattedDate}
            </div>
          </GlassCard>
        </div>
      </CardContent>
    </Card>
  );
}
