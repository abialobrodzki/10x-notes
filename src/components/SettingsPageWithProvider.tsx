import { QueryProvider } from "@/components/QueryProvider";
import { SettingsPage } from "@/components/settings/SettingsPage";
import type { UserProfileDTO, UserStatsDTO } from "@/types";

interface SettingsPageWithProviderProps {
  initialProfile: UserProfileDTO | null;
  initialStats: UserStatsDTO | null;
  initialError: string | null;
}

/**
 * SettingsPageWithProvider - wraps SettingsPage with QueryProvider
 * Required because SettingsPage contains DeleteAccountWizard which uses TanStack Query mutation hooks
 */
export default function SettingsPageWithProvider({
  initialProfile,
  initialStats,
  initialError,
}: SettingsPageWithProviderProps) {
  return (
    <QueryProvider>
      <SettingsPage initialProfile={initialProfile} initialStats={initialStats} initialError={initialError} />
    </QueryProvider>
  );
}
