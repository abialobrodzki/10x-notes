import { useEffect, useState } from "react";
import type { UserProfileDTO } from "@/types";

interface UseUserProfileReturn {
  userProfile: UserProfileDTO | null;
  isLoading: boolean;
}

/**
 * Hook to fetch user profile information
 */
export function useUserProfile(isAuthenticated: boolean): UseUserProfileReturn {
  const [userProfile, setUserProfile] = useState<UserProfileDTO | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    setIsLoading(true);

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
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [isAuthenticated]);

  return {
    userProfile,
    isLoading,
  };
}
