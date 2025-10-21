import { requireAuth } from "../../../../../lib/middleware/auth.middleware";
import { PublicLinksService } from "../../../../../lib/services/public-links.service";
import { uuidSchema } from "../../../../../lib/validators/shared.schemas";
import type { PublicLinkDTO } from "../../../../../types";
import type { APIRoute } from "astro";

// Disable prerendering - this is a dynamic API endpoint
export const prerender = false;

/**
 * POST /api/notes/{id}/public-link/rotate
 *
 * Rotate (change) the public link token for a note
 * Only note owner can rotate tokens. Old token becomes immediately invalid.
 *
 * Security considerations:
 * - Sensitive operation with lower rate limit (100 req/h recommended)
 * - Generates new cryptographically secure UUID v4 token
 * - Old token is immediately invalidated
 * - Operation should be logged for security audit
 *
 * @param params.id - Note ID (UUID)
 * @returns 200 - Updated public link with new token
 * @returns 400 - Invalid UUID format
 * @returns 401 - Missing or invalid authentication token
 * @returns 403 - Not owner
 * @returns 404 - Note or public link not found
 * @returns 500 - Internal server error
 */
export const POST: APIRoute = async ({ params, locals }) => {
  try {
    // Step 1: Require authentication
    const { userId } = await requireAuth(locals.supabase);

    // Step 2: Validate UUID parameter
    const noteId = params.id;

    if (!noteId) {
      return new Response(
        JSON.stringify({
          error: "Bad request",
          message: "Note ID is required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const uuidValidation = uuidSchema.safeParse(noteId);

    if (!uuidValidation.success) {
      return new Response(
        JSON.stringify({
          error: "Bad request",
          message: "Invalid note ID format",
          details: "Note ID must be a valid UUID",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 3: Rotate token via service
    const publicLinksService = new PublicLinksService(locals.supabase);
    let result: PublicLinkDTO;

    try {
      result = await publicLinksService.rotateToken(userId, noteId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Handle specific error cases
      if (errorMessage === "NOTE_NOT_FOUND") {
        return new Response(
          JSON.stringify({
            error: "Not found",
            message: "Note not found",
            details: "The requested note does not exist",
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (errorMessage === "NOTE_NOT_OWNED") {
        return new Response(
          JSON.stringify({
            error: "Forbidden",
            message: "Access denied",
            details: "You do not have permission to rotate this note's public link token",
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (errorMessage === "LINK_NOT_FOUND") {
        return new Response(
          JSON.stringify({
            error: "Not found",
            message: "Public link not found",
            details: "No public link exists for this note. Create one first using POST /api/notes/{id}/public-link",
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (errorMessage === "TOKEN_COLLISION") {
        // Extremely rare - UUID v4 collision, log for monitoring
        // eslint-disable-next-line no-console
        console.error("TOKEN_COLLISION: UUID v4 collision detected during token rotation!", {
          userId,
          noteId,
        });

        return new Response(
          JSON.stringify({
            error: "Internal server error",
            message: "Failed to generate unique token",
            details: "Please try again",
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Generic service error
      // eslint-disable-next-line no-console
      console.error("PublicLinksService.rotateToken error:", {
        userId,
        noteId,
        error: errorMessage,
      });

      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: "Failed to rotate public link token",
          details: errorMessage,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 4: Return 200 OK with updated public link (new token)
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    // Catch authentication errors (thrown as Response by requireAuth)
    if (error instanceof Response) {
      return error;
    }

    // Catch-all for unexpected errors
    // eslint-disable-next-line no-console
    console.error("Unexpected error in POST /api/notes/[id]/public-link/rotate:", error);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: "An unexpected error occurred",
        details: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
