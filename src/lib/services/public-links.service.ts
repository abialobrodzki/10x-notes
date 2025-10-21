import { generatePublicLinkToken } from "../utils/token.utils";
import type { Database } from "../../db/database.types";
import type { PublicLinkDTO, UpdatePublicLinkCommand } from "../../types";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Public Links Service
 * Handles business logic for public link management
 */
export class PublicLinksService {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  /**
   * Create or retrieve existing public link for a note
   *
   * Idempotent operation:
   * - If link already exists: returns existing link with is_new: false
   * - If link doesn't exist: creates new link with is_new: true
   *
   * Only note owner can create public links.
   *
   * @param userId - Current user ID (from JWT)
   * @param noteId - Note ID to create public link for
   * @returns Public link DTO with is_new flag and created_at timestamp
   * @throws Error if note not found, user not owner, or database error
   */
  async createPublicLink(userId: string, noteId: string): Promise<{ link: PublicLinkDTO; is_new: boolean }> {
    // Step 1: Check note ownership - verify note exists and current user is the owner
    const { data: note, error: noteError } = await this.supabase
      .from("notes")
      .select("id, user_id")
      .eq("id", noteId)
      .single();

    if (noteError || !note) {
      throw new Error("NOTE_NOT_FOUND");
    }

    if (note.user_id !== userId) {
      throw new Error("NOTE_NOT_OWNED");
    }

    // Step 2: Check if public link already exists for this note
    const { data: existingLink, error: checkError } = await this.supabase
      .from("public_links")
      .select("token, is_enabled, created_at")
      .eq("note_id", noteId)
      .single();

    // If link exists, return it with is_new: false (idempotent behavior)
    if (existingLink && !checkError) {
      return {
        link: {
          token: existingLink.token,
          url: `/public/${existingLink.token}`,
          is_enabled: existingLink.is_enabled,
          is_new: false,
          created_at: existingLink.created_at,
        },
        is_new: false,
      };
    }

    // If error is not "no rows found", throw it
    if (checkError && checkError.code !== "PGRST116") {
      throw new Error(`Failed to check existing public link: ${checkError.message}`);
    }

    // Step 3: Generate cryptographically secure UUID v4 token
    const token = generatePublicLinkToken();

    // Step 4: Create new public link
    const { data: newLink, error: insertError } = await this.supabase
      .from("public_links")
      .insert({
        note_id: noteId,
        token: token,
        is_enabled: true,
      })
      .select("token, is_enabled, created_at")
      .single();

    if (insertError) {
      // Handle unique constraint violation (in case of race condition)
      if (insertError.code === "23505") {
        // Token collision - extremely rare with UUID v4, retry once
        throw new Error("TOKEN_COLLISION");
      }
      throw new Error(`Failed to create public link: ${insertError.message}`);
    }

    if (!newLink) {
      throw new Error("Public link creation failed: no data returned");
    }

    // Step 5: Return new link with is_new: true
    return {
      link: {
        token: newLink.token,
        url: `/public/${newLink.token}`,
        is_enabled: newLink.is_enabled,
        is_new: true,
        created_at: newLink.created_at,
      },
      is_new: true,
    };
  }

  /**
   * Update public link settings
   *
   * Only note owner can update public links.
   * MVP: Only is_enabled can be toggled.
   *
   * @param userId - Current user ID (from JWT)
   * @param noteId - Note ID to update public link for
   * @param patch - Fields to update (at least one required)
   * @returns Updated public link DTO with updated_at timestamp
   * @throws Error if note not found, user not owner, link not found, or database error
   */
  async updatePublicLink(userId: string, noteId: string, patch: UpdatePublicLinkCommand): Promise<PublicLinkDTO> {
    // Step 1: Check note ownership - verify note exists and current user is the owner
    const { data: note, error: noteError } = await this.supabase
      .from("notes")
      .select("id, user_id")
      .eq("id", noteId)
      .single();

    if (noteError || !note) {
      throw new Error("NOTE_NOT_FOUND");
    }

    if (note.user_id !== userId) {
      throw new Error("NOTE_NOT_OWNED");
    }

    // Step 2: Check if public link exists for this note
    const { data: existingLink, error: checkError } = await this.supabase
      .from("public_links")
      .select("id, token, is_enabled")
      .eq("note_id", noteId)
      .single();

    if (checkError || !existingLink) {
      throw new Error("LINK_NOT_FOUND");
    }

    // Step 3: Update public link with provided fields and updated_at
    const { data: updatedLink, error: updateError } = await this.supabase
      .from("public_links")
      .update({
        ...patch,
        updated_at: new Date().toISOString(),
      })
      .eq("note_id", noteId)
      .select("token, is_enabled, updated_at")
      .single();

    if (updateError) {
      throw new Error(`Failed to update public link: ${updateError.message}`);
    }

    if (!updatedLink) {
      throw new Error("Public link update failed: no data returned");
    }

    // Step 4: Return updated DTO without id field, with updated_at
    return {
      token: updatedLink.token,
      url: `/public/${updatedLink.token}`,
      is_enabled: updatedLink.is_enabled,
      updated_at: updatedLink.updated_at,
    };
  }
}
