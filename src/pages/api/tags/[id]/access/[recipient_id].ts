import { requireAuth } from "../../../../../lib/middleware/auth.middleware";
import { TagAccessService } from "../../../../../lib/services/tag-access.service";
import { uuidSchema } from "../../../../../lib/validators/shared.schemas";
import { tagIdParamSchema } from "../../../../../lib/validators/tags.schemas";
import type { APIRoute } from "astro";

// Disable prerendering - this is a dynamic API endpoint
export const prerender = false;

/**
 * DELETE /api/tags/{id}/access/{recipient_id}
 *
 * Revoke access to a tag from a user
 * Only tag owner can revoke access
 * Authentication required via JWT Bearer token
 *
 * @param params.id - Tag ID (UUID)
 * @param params.recipient_id - Recipient user ID (UUID)
 * @returns 204 - No Content (access revoked successfully)
 * @returns 400 - Invalid UUID format
 * @returns 401 - Missing or invalid authentication token
 * @returns 403 - Not owner (only tag owner can revoke access)
 * @returns 404 - Tag not found or access grant not found
 * @returns 500 - Internal server error
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    // Step 1: Require authentication
    const { userId } = await requireAuth(locals.supabase);

    // Step 2: Validate tag ID parameter
    const tagId = params.id;

    if (!tagId) {
      return new Response(
        JSON.stringify({
          error: "Bad request",
          message: "Tag ID is required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const tagIdValidation = tagIdParamSchema.safeParse({ id: tagId });

    if (!tagIdValidation.success) {
      const errors = tagIdValidation.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      return new Response(
        JSON.stringify({
          error: "Bad request",
          message: "Invalid tag ID format",
          details: errors,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 3: Validate recipient_id parameter
    const recipientId = params.recipient_id;

    if (!recipientId) {
      return new Response(
        JSON.stringify({
          error: "Bad request",
          message: "Recipient ID is required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const recipientIdValidation = uuidSchema.safeParse(recipientId);

    if (!recipientIdValidation.success) {
      return new Response(
        JSON.stringify({
          error: "Bad request",
          message: "Invalid recipient ID format",
          details: "Recipient ID must be a valid UUID",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 4: Revoke tag access via service
    const tagAccessService = new TagAccessService(locals.supabase);

    try {
      await tagAccessService.revokeTagAccess(userId, tagId, recipientId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Handle specific error cases
      if (errorMessage === "TAG_NOT_FOUND") {
        return new Response(
          JSON.stringify({
            error: "Not found",
            message: "Tag not found",
            details: "The requested tag does not exist",
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (errorMessage === "TAG_NOT_OWNED") {
        return new Response(
          JSON.stringify({
            error: "Forbidden",
            message: "Forbidden: Only tag owner can revoke access",
            details: "You are not the owner of this tag",
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (errorMessage === "ACCESS_NOT_FOUND") {
        return new Response(
          JSON.stringify({
            error: "Not found",
            message: "Access grant not found",
            details: "The specified user does not have access to this tag",
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Generic service error
      // eslint-disable-next-line no-console
      console.error("TagAccessService.revokeTagAccess error:", {
        userId,
        tagId,
        recipientId,
        error: errorMessage,
      });

      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: "Failed to revoke tag access",
          details: errorMessage,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 5: Return 204 No Content (successful deletion)
    return new Response(null, {
      status: 204,
    });
  } catch (error) {
    // Catch authentication errors (thrown as Response by requireAuth)
    if (error instanceof Response) {
      return error;
    }

    // Catch-all for unexpected errors
    // eslint-disable-next-line no-console
    console.error("Unexpected error in DELETE /api/tags/[id]/access/[recipient_id]:", error);

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
