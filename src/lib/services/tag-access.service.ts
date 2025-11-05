import type { Database } from "../../db/database.types";
import type { TagAccessListDTO, TagAccessRecipientDTO, TagAccessGrantedDTO } from "../../types";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Tag Access Service
 * @deprecated This service has been replaced by the DDD implementation in src/domains/sharing/
 * Use the following instead:
 * - SupabaseTagRepository: src/domains/sharing/infrastructure/supabase-tag.repository.ts
 * - GetAccessListUseCase: src/domains/sharing/application/get-access-list.use-case.ts
 * - GrantAccessUseCase: src/domains/sharing/application/grant-access.use-case.ts
 * - RevokeAccessUseCase: src/domains/sharing/application/revoke-access.use-case.ts
 *
 * Handles business logic for tag access management
 */
export class TagAccessService {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  /**
   * Get list of users with access to a tag
   *
   * Returns list of recipients (users) who have access to the specified tag.
   * Only tag owner can view the access list.
   *
   * Uses RPC function get_tag_access_list() which:
   * - Verifies tag ownership
   * - Fetches recipients with emails from auth.users (SECURITY DEFINER)
   * - Returns only data for tags owned by current user
   *
   * @param userId - Current user ID (from JWT) - not used directly, auth.uid() is used in RPC
   * @param tagId - Tag ID to get access list for
   * @returns List of recipients with access to the tag
   * @throws Error if tag not found, user not owner, or database query fails
   */
  async getTagAccess(userId: string, tagId: string): Promise<TagAccessListDTO> {
    // Call RPC function that handles ownership check and fetches emails
    // Function signature: get_tag_access_list(p_tag_id uuid) -> TABLE(recipient_id uuid, email text, granted_at timestamptz)
    // The function uses auth.uid() internally to verify ownership
    const { data: recipients, error } = await this.supabase.rpc("get_tag_access_list", {
      p_tag_id: tagId,
    });

    if (error) {
      // Check for specific error messages from the RPC function
      if (error.message.includes("not found")) {
        throw new Error("TAG_NOT_FOUND");
      }
      if (error.message.includes("not owner") || error.message.includes("Forbidden")) {
        throw new Error("TAG_NOT_OWNED");
      }
      throw new Error(`Failed to fetch tag access list: ${error.message}`);
    }

    // Transform to DTO format
    const recipientDTOs: TagAccessRecipientDTO[] = (recipients || []).map(
      (recipient: { recipient_id: string; email: string; granted_at: string }) => ({
        recipient_id: recipient.recipient_id,
        email: recipient.email,
        granted_at: recipient.granted_at,
      })
    );

    return { recipients: recipientDTOs };
  }

  /**
   * Grant access to a tag to another user by email
   *
   * Only tag owner can grant access. Recipient must exist in auth.users
   * with confirmed email. Cannot share with self. Prevents duplicate grants.
   *
   * Uses RPC function grant_tag_access() which:
   * - Verifies tag ownership
   * - Resolves email to user_id from auth.users (SECURITY DEFINER)
   * - Validates email confirmation
   * - Prevents self-sharing and duplicates
   * - Inserts into tag_access table
   *
   * @param userId - Current user ID (from JWT) - not used directly, auth.uid() is used in RPC
   * @param tagId - Tag ID to grant access to
   * @param recipientEmail - Email address of recipient user
   * @returns Granted access details (recipient_id, email, granted_at)
   * @throws Error if tag not found, user not owner, recipient not found, etc.
   */
  async grantTagAccess(userId: string, tagId: string, recipientEmail: string): Promise<TagAccessGrantedDTO> {
    // Call RPC function that handles all validation and insertion
    // Function signature: grant_tag_access(p_tag_id uuid, p_recipient_email text) -> TABLE(recipient_id uuid, email text, granted_at timestamptz)
    const { data, error } = await this.supabase.rpc("grant_tag_access", {
      p_tag_id: tagId,
      p_recipient_email: recipientEmail,
    });

    if (error) {
      // Parse specific error messages from the RPC function
      const errorMsg = error.message;

      if (errorMsg.includes("Tag not found")) {
        throw new Error("TAG_NOT_FOUND");
      }
      if (errorMsg.includes("not owner") || errorMsg.includes("Forbidden")) {
        throw new Error("TAG_NOT_OWNED");
      }
      if (errorMsg.includes("User with this email not found")) {
        throw new Error("USER_NOT_FOUND");
      }
      if (errorMsg.includes("email not confirmed")) {
        throw new Error("USER_EMAIL_NOT_CONFIRMED");
      }
      if (errorMsg.includes("share tag with yourself")) {
        throw new Error("CANNOT_SHARE_WITH_SELF");
      }
      if (errorMsg.includes("already has access")) {
        throw new Error("DUPLICATE_ACCESS");
      }

      throw new Error(`Failed to grant tag access: ${errorMsg}`);
    }

    // RPC returns array with single row
    if (!data || data.length === 0) {
      throw new Error("Failed to grant tag access: no data returned");
    }

    const result = data[0];

    return {
      recipient_id: result.recipient_id,
      email: result.email,
      granted_at: result.granted_at,
    };
  }

  /**
   * Revoke access to a tag from a user
   *
   * Only tag owner can revoke access.
   * Uses RPC function revoke_tag_access() which:
   * - Verifies tag ownership
   * - Deletes tag_access record with SECURITY DEFINER (bypasses RLS)
   * - Returns success status with deleted count
   *
   * @param userId - Current user ID (from JWT) - not used directly, auth.uid() is used in RPC
   * @param tagId - Tag ID to revoke access from
   * @param recipientId - User ID whose access should be revoked
   * @throws Error if tag not found, user not owner, or RPC fails
   */
  async revokeTagAccess(userId: string, tagId: string, recipientId: string): Promise<void> {
    // Call RPC function that handles ownership check and deletion
    // Function signature: revoke_tag_access(p_tag_id uuid, p_recipient_id uuid) -> jsonb
    // The function uses auth.uid() internally to verify ownership
    const { data, error } = await this.supabase.rpc("revoke_tag_access", {
      p_tag_id: tagId,
      p_recipient_id: recipientId,
    });

    if (error) {
      throw new Error(`Failed to revoke tag access: ${error.message}`);
    }

    // Check if RPC returned error in response
    if (!data || typeof data !== "object") {
      throw new Error("Failed to revoke tag access: invalid response from server");
    }

    const result = data as { success: boolean; error?: string; deleted_count?: number };

    if (!result.success) {
      const errorMsg = result.error || "Unknown error";

      // Parse specific error messages from the RPC function
      if (errorMsg.includes("Tag not found")) {
        throw new Error("TAG_NOT_FOUND");
      }
      if (errorMsg.includes("not owner") || errorMsg.includes("Forbidden")) {
        throw new Error("TAG_NOT_OWNED");
      }
      if (errorMsg.includes("Unauthorized")) {
        throw new Error("UNAUTHORIZED");
      }

      throw new Error(`Failed to revoke tag access: ${errorMsg}`);
    }

    // Success - RPC executed and deleted the record
  }
}
