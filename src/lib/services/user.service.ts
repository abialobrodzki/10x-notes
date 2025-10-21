import type { Database } from "../../db/database.types";
import type { UserProfileDTO } from "../../types";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * User Service
 * Handles business logic for user profile management
 */
export class UserService {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  /**
   * Get user profile by user ID
   *
   * Fetches user data from Supabase Auth (auth.users table).
   * Returns only public profile fields (id, email, created_at).
   *
   * Note: User can only access their own profile (enforced by authentication).
   *
   * @param userId - User ID from JWT authentication
   * @returns UserProfileDTO or null if user not found
   * @throws Error if database error occurs
   */
  async getUserProfile(userId: string): Promise<UserProfileDTO | null> {
    // Fetch user from Supabase Auth
    // Note: Using auth.admin.getUserById would require service role,
    // but we can use the regular client with the authenticated user's session
    const {
      data: { user },
      error,
    } = await this.supabase.auth.getUser();

    if (error) {
      throw new Error(`Failed to fetch user profile: ${error.message}`);
    }

    // User not found (shouldn't happen if authenticated, but handle gracefully)
    if (!user) {
      return null;
    }

    // Verify the user ID matches (security check)
    if (user.id !== userId) {
      throw new Error("USER_ID_MISMATCH");
    }

    // Map to DTO with only public fields
    return {
      id: user.id,
      email: user.email ?? "", // Email should always exist for authenticated users
      created_at: user.created_at,
    };
  }
}
