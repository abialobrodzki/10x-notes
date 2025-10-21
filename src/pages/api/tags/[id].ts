import { requireAuth } from "../../../lib/middleware/auth.middleware";
import { TagsService } from "../../../lib/services/tags.service";
import { uuidSchema } from "../../../lib/validators/shared.schemas";
import { updateTagSchema, type UpdateTagInput } from "../../../lib/validators/tags.schemas";
import type { TagDTO } from "../../../types";
import type { APIRoute } from "astro";

// Disable prerendering - this is a dynamic API endpoint
export const prerender = false;

/**
 * PATCH /api/tags/{id}
 *
 * Update tag name
 * Only owner can update. New name must be unique within user's tags.
 * Authentication required via JWT Bearer token
 *
 * @param params.id - Tag ID (UUID)
 * @param request.body - Tag update data (name)
 * @returns 200 - Updated tag
 * @returns 400 - Invalid UUID format or request body
 * @returns 401 - Missing or invalid authentication token
 * @returns 403 - Not owner (attempt to edit someone else's tag)
 * @returns 404 - Tag not found
 * @returns 409 - Tag with this name already exists
 * @returns 500 - Internal server error
 */
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  try {
    // Step 1: Require authentication
    const { userId } = await requireAuth(locals.supabase);

    // Step 2: Validate UUID parameter
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

    const uuidValidation = uuidSchema.safeParse(tagId);

    if (!uuidValidation.success) {
      return new Response(
        JSON.stringify({
          error: "Bad request",
          message: "Invalid tag ID format",
          details: "Tag ID must be a valid UUID",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 3: Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: "Invalid JSON",
          message: "Request body must be valid JSON",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 4: Validate request body with Zod schema
    const validationResult = updateTagSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      return new Response(
        JSON.stringify({
          error: "Validation failed",
          message: "Invalid request body",
          details: errors,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const validatedInput: UpdateTagInput = validationResult.data;

    // Step 5: Update tag via service
    const tagsService = new TagsService(locals.supabase);
    let result: TagDTO;

    try {
      result = await tagsService.updateTag(userId, tagId, validatedInput);
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
            message: "Access denied",
            details: "You are not the owner of this tag",
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (errorMessage === "TAG_NAME_ALREADY_EXISTS") {
        return new Response(
          JSON.stringify({
            error: "Conflict",
            message: "Tag with this name already exists",
            details: "A tag with this name already exists in your account. Please use a different name.",
          }),
          {
            status: 409,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Generic service error
      // eslint-disable-next-line no-console
      console.error("TagsService.updateTag error:", {
        userId,
        tagId,
        input: validatedInput,
        error: errorMessage,
      });

      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: "Failed to update tag",
          details: errorMessage,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 6: Return 200 OK with updated tag data
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
    console.error("Unexpected error in PATCH /api/tags/[id]:", error);

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

/**
 * DELETE /api/tags/{id}
 *
 * Delete a tag by ID
 * Only owner can delete. Tag cannot be deleted if it has assigned notes.
 * Authentication required via JWT Bearer token
 *
 * @param params.id - Tag ID (UUID)
 * @returns 204 - No Content (successful deletion)
 * @returns 400 - Invalid UUID format
 * @returns 401 - Missing or invalid authentication token
 * @returns 404 - Tag not found or access denied (don't reveal existence)
 * @returns 409 - Cannot delete tag with existing notes
 * @returns 500 - Internal server error
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    // Step 1: Require authentication
    const { userId } = await requireAuth(locals.supabase);

    // Step 2: Validate UUID parameter
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

    const uuidValidation = uuidSchema.safeParse(tagId);

    if (!uuidValidation.success) {
      return new Response(
        JSON.stringify({
          error: "Bad request",
          message: "Invalid tag ID format",
          details: "Tag ID must be a valid UUID",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 3: Delete tag via service
    const tagsService = new TagsService(locals.supabase);

    try {
      await tagsService.deleteTag(userId, tagId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Handle specific error cases - both NOT_FOUND and NOT_OWNED return 404
      // Security: Don't reveal whether tag exists if user doesn't own it
      if (errorMessage === "TAG_NOT_FOUND" || errorMessage === "TAG_NOT_OWNED") {
        return new Response(
          JSON.stringify({
            error: "Not found",
            message: "Tag not found",
            details: "The requested tag does not exist or you do not have permission to delete it",
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Handle tag has notes error (409 Conflict)
      if (errorMessage === "TAG_HAS_NOTES") {
        return new Response(
          JSON.stringify({
            error: "Conflict",
            message: "Cannot delete tag with existing notes",
            details: "This tag has notes assigned to it. Please reassign or delete the notes first.",
          }),
          {
            status: 409,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Generic service error
      // eslint-disable-next-line no-console
      console.error("TagsService.deleteTag error:", {
        userId,
        tagId,
        error: errorMessage,
      });

      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: "Failed to delete tag",
          details: errorMessage,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 4: Return 204 No Content (successful deletion)
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
    console.error("Unexpected error in DELETE /api/tags/[id]:", error);

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
