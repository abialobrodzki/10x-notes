import { supabaseAdmin } from "./supabase-admin";
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
   * @param userId - User ID from JWT authentication
   * @param confirmationEmail - Email confirmation (must match user's account email)
   * @returns true if deletion successful
   * @throws Error if confirmation email doesn't match or database operation fails
   */
  async deleteAccount(userId: string, confirmationEmail: string): Promise<boolean> {
    // Step 1: Fetch user's email from auth using the admin client
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (userError || !user) {
      throw new Error("USER_NOT_FOUND");
    }

    // Step 2: Validate confirmation email matches user's account email
    if (user.email?.toLowerCase() !== confirmationEmail.toLowerCase()) {
      throw new Error("EMAIL_CONFIRMATION_MISMATCH");
    }

    // Step 3: Delete all user data in correct order (respecting FK constraints)
    // Note: We use the admin client for deletions to bypass RLS policies
    // The order is critical due to RESTRICT constraint on tags

    // Delete notes first (CASCADE deletes public_links automatically)
    const { error: notesError } = await supabaseAdmin.from("notes").delete().eq("user_id", userId);

    if (notesError) {
      throw new Error(`Failed to delete notes: ${notesError.message}`);
    }

    // Delete tags (CASCADE deletes tag_access where user is owner)
    const { error: tagsError } = await supabaseAdmin.from("tags").delete().eq("user_id", userId);

    if (tagsError) {
      throw new Error(`Failed to delete tags: ${tagsError.message}`);
    }

    // Delete tag_access entries where user is recipient (not cascaded)
    const { error: tagAccessError } = await supabaseAdmin.from("tag_access").delete().eq("recipient_id", userId);

    if (tagAccessError) {
      throw new Error(`Failed to delete tag access permissions: ${tagAccessError.message}`);
    }

    // Step 4: Delete user from auth.users (Supabase Auth)
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      throw new Error(`Failed to delete user account: ${deleteAuthError.message}`);
    }

    // Step 5: Return success
    return true;
  }
}
