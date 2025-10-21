import { requireAuth } from "../../../../../lib/middleware/auth.middleware";
import { PublicLinksService } from "../../../../../lib/services/public-links.service";
import {
  createPublicLinkSchema,
  patchPublicLinkSchema,
  type PatchPublicLinkInput,
} from "../../../../../lib/validators/public-links.schemas";
import { uuidSchema } from "../../../../../lib/validators/shared.schemas";
import type { PublicLinkDTO } from "../../../../../types";
import type { APIRoute } from "astro";

// Disable prerendering - this is a dynamic API endpoint
export const prerender = false;

/**
 * POST /api/notes/{id}/public-link
 *
 * Create or retrieve existing public link for a note
 * Only note owner can create public links
 * Idempotent: returns existing link if already exists
 * Authentication required via JWT Bearer token
 *
 * @param params.id - Note ID (UUID)
 * @param request.body - Empty object or omit (no fields required in MVP)
 * @returns 201 - Created (new link created with is_new: true)
 * @returns 200 - OK (existing link returned with is_new: false)
 * @returns 400 - Invalid UUID format
 * @returns 401 - Missing or invalid authentication token
 * @returns 403 - Not owner (only note owner can create public link)
 * @returns 404 - Note not found
 * @returns 500 - Internal server error
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    // Step 1: Require authentication
    const { userId } = await requireAuth(locals.supabase);

    // Step 2: Validate note ID parameter
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

    const noteIdValidation = uuidSchema.safeParse(noteId);

    if (!noteIdValidation.success) {
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

    // Step 3: Parse and validate request body (empty object or omit entirely)
    let body: unknown = {};

    // Try to parse JSON if body exists, but don't fail if it's empty
    const contentType = request.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      try {
        const text = await request.text();
        if (text.trim()) {
          body = JSON.parse(text);
        }
      } catch {
        return new Response(
          JSON.stringify({
            error: "Invalid JSON",
            message: "Request body must be valid JSON or empty",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    const bodyValidation = createPublicLinkSchema.safeParse(body);

    if (!bodyValidation.success) {
      const errors = bodyValidation.error.errors.map((err) => ({
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

    // Step 4: Create or retrieve public link via service
    const publicLinksService = new PublicLinksService(locals.supabase);
    let result: { link: PublicLinkDTO; is_new: boolean };

    try {
      result = await publicLinksService.createPublicLink(userId, noteId);
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
            message: "Forbidden: You are not the owner of this note",
            details: "Only the note owner can create a public link",
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (errorMessage === "TOKEN_COLLISION") {
        // Extremely rare - UUID v4 collision, log for monitoring
        // eslint-disable-next-line no-console
        console.error("TOKEN_COLLISION: UUID v4 collision detected!", {
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
      console.error("PublicLinksService.createPublicLink error:", {
        userId,
        noteId,
        error: errorMessage,
      });

      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: "Failed to create public link",
          details: errorMessage,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 5: Return appropriate status based on is_new flag
    // 201 Created if new link was created, 200 OK if existing link returned (idempotent)
    const statusCode = result.is_new ? 201 : 200;

    return new Response(JSON.stringify(result.link), {
      status: statusCode,
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
    console.error("Unexpected error in POST /api/notes/[id]/public-link:", error);

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
 * PATCH /api/notes/{id}/public-link
 *
 * Update public link settings for a note
 * Only note owner can update. MVP: Only is_enabled can be toggled.
 *
 * Updatable fields:
 * - is_enabled (boolean, optional) - Enable/disable the public link
 *
 * @param params.id - Note ID (UUID)
 * @param request.body - Fields to update (at least one required)
 * @returns 200 - Updated public link
 * @returns 400 - Invalid request (no fields, invalid UUID, validation errors)
 * @returns 401 - Missing or invalid authentication token
 * @returns 403 - Not owner
 * @returns 404 - Note or public link not found
 * @returns 500 - Internal server error
 */
export const PATCH: APIRoute = async ({ params, request, locals }) => {
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
    const validationResult = patchPublicLinkSchema.safeParse(body);

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

    const validatedInput: PatchPublicLinkInput = validationResult.data;

    // Step 5: Update public link via service
    const publicLinksService = new PublicLinksService(locals.supabase);
    let result: PublicLinkDTO;

    try {
      result = await publicLinksService.updatePublicLink(userId, noteId, validatedInput);
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
            details: "You do not have permission to update this note's public link",
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

      // Generic service error
      // eslint-disable-next-line no-console
      console.error("PublicLinksService.updatePublicLink error:", {
        userId,
        noteId,
        error: errorMessage,
      });

      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: "Failed to update public link",
          details: errorMessage,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 6: Return 200 OK with updated public link
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
    console.error("Unexpected error in PATCH /api/notes/[id]/public-link:", error);

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
 * DELETE /api/notes/{id}/public-link
 *
 * Delete the public link for a note
 * Only note owner can delete. Token becomes immediately invalid after deletion.
 *
 * @param params.id - Note ID (UUID)
 * @returns 204 - No Content (successful deletion)
 * @returns 400 - Invalid UUID format
 * @returns 401 - Missing or invalid authentication token
 * @returns 403 - Not owner
 * @returns 404 - Note or public link not found
 * @returns 500 - Internal server error
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
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

    // Step 3: Delete public link via service
    const publicLinksService = new PublicLinksService(locals.supabase);

    try {
      await publicLinksService.deletePublicLink(userId, noteId);
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
            details: "You do not have permission to delete this note's public link",
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
            details: "No public link exists for this note",
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Generic service error
      // eslint-disable-next-line no-console
      console.error("PublicLinksService.deletePublicLink error:", {
        userId,
        noteId,
        error: errorMessage,
      });

      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: "Failed to delete public link",
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
    console.error("Unexpected error in DELETE /api/notes/[id]/public-link:", error);

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
