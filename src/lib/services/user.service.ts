import type { Database } from "../../db/database.types";
import type { UserProfileDTO, UserStatsDTO } from "../../types";
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

  /**
   * Delete user account and all associated data
   *
   * CRITICAL OPERATION - IRREVERSIBLE!
   * Cascades deletion of:
   * - All notes (CASCADE deletes public_links automatically)
   * - All tags (CASCADE deletes tag_access where user is owner)
   * - All tag_access entries where user is recipient
   * - User auth record
   *
   * GDPR Compliance: Implements "right to be forgotten"
   *
   * Implementation: Uses database function with SECURITY DEFINER for elevated privileges.
   * User can only delete their own account (enforced by authentication).
   *
   * @param userId - User ID from JWT authentication
   * @param confirmationEmail - Email confirmation (must match user's account email)
   * @returns true if deletion successful
   * @throws Error if confirmation email doesn't match or database operation fails
   */
  async deleteAccount(userId: string, confirmationEmail: string): Promise<boolean> {
    // Call database function - executes with elevated privileges (SECURITY DEFINER)
    // User can only delete their own account (enforced by authentication)
    const { data, error } = await this.supabase.rpc("delete_user_account", {
      p_user_id: userId,
      p_confirmation_email: confirmationEmail,
    });

    if (error) {
      // Handle specific errors from database function
      if (error.message.includes("USER_NOT_FOUND")) {
        throw new Error("USER_NOT_FOUND");
      }
      if (error.message.includes("EMAIL_CONFIRMATION_MISMATCH")) {
        throw new Error("EMAIL_CONFIRMATION_MISMATCH");
      }
      throw new Error(`Failed to delete account: ${error.message}`);
    }

    return data ?? false;
  }

  /**
   * Get user statistics (AI generation metrics, notes count, tags count)
   *
   * Aggregates data from:
   * - user_generation_stats VIEW (AI generation metrics)
   * - notes table (count of user's notes)
   * - tags table (count of user's tags)
   *
   * Performance: Executes 3 queries in parallel for optimal performance
   *
   * @param userId - User ID from JWT authentication
   * @returns UserStatsDTO with aggregated statistics (nulls coalesced to 0)
   * @throws Error if database query fails
   */
  async getUserStats(userId: string): Promise<UserStatsDTO> {
    // Execute all queries in parallel for better performance
    const [generationStatsResult, notesCountResult, tagsCountResult] = await Promise.all([
      // Query 1: Fetch AI generation statistics from VIEW
      this.supabase.from("user_generation_stats").select("*").eq("user_id", userId).maybeSingle(),

      // Query 2: Count user's notes
      this.supabase.from("notes").select("*", { count: "exact", head: true }).eq("user_id", userId),

      // Query 3: Count user's tags
      this.supabase.from("tags").select("*", { count: "exact", head: true }).eq("user_id", userId),
    ]);

    // Handle errors from parallel queries
    if (generationStatsResult.error) {
      throw new Error(`Failed to fetch generation stats: ${generationStatsResult.error.message}`);
    }

    if (notesCountResult.error) {
      throw new Error(`Failed to count notes: ${notesCountResult.error.message}`);
    }

    if (tagsCountResult.error) {
      throw new Error(`Failed to count tags: ${tagsCountResult.error.message}`);
    }

    // Extract generation stats (may be null if user has no generations yet)
    const generationStats = generationStatsResult.data;

    // Extract counts (default to 0 if null)
    const totalNotes = notesCountResult.count ?? 0;
    const totalTags = tagsCountResult.count ?? 0;

    // Build UserStatsDTO with coalesced values (null → 0)
    // Note: If user has no AI generations, all generation metrics default to 0
    return {
      total_generations: generationStats?.total_generations ?? 0,
      successful_generations: generationStats?.successful_generations ?? 0,
      failed_generations: generationStats?.failed_generations ?? 0,
      total_tokens: generationStats?.total_tokens ?? 0,
      // avg_time_ms is a float from AVG(), round to integer
      avg_time_ms: generationStats?.avg_time_ms ? Math.round(generationStats.avg_time_ms) : 0,
      total_notes: totalNotes,
      total_tags: totalTags,
    };
  }
}
