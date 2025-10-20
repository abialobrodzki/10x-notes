import { requireAuth } from "../../../lib/middleware/auth.middleware";
import { NotesService } from "../../../lib/services/notes.service";
import { updateNoteSchema, type UpdateNoteInput } from "../../../lib/validators/notes.schemas";
import { uuidSchema } from "../../../lib/validators/shared.schemas";
import type { NoteDetailDTO, NoteDTO } from "../../../types";
import type { APIRoute } from "astro";

// Disable prerendering - this is a dynamic API endpoint
export const prerender = false;

/**
 * GET /api/notes/{id}
 *
 * Get full details of a single note by ID
 * Includes original_content, ownership info, and public link (for owners)
 *
 * Access control:
 * - Note owner can access
 * - Users with shared access to the note's tag can access
 * - Returns 404 if note not found or user has no access (security: don't reveal existence)
 *
 * @param params.id - Note ID (UUID)
 * @returns 200 - Full note details
 * @returns 400 - Invalid UUID format
 * @returns 401 - Missing or invalid authentication token
 * @returns 404 - Note not found or access denied
 * @returns 500 - Internal server error
 */
export const GET: APIRoute = async ({ params, locals }) => {
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

    // Step 3: Get note from service
    const notesService = new NotesService(locals.supabase);
    let result: NoteDetailDTO | null;

    try {
      result = await notesService.getNoteById(userId, noteId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // eslint-disable-next-line no-console
      console.error("NotesService.getNoteById error:", {
        userId,
        noteId,
        error: errorMessage,
      });

      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: "Failed to fetch note",
          details: errorMessage,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 4: Return 404 if note not found or no access
    if (!result) {
      return new Response(
        JSON.stringify({
          error: "Not found",
          message: "Note not found",
          details: "The requested note does not exist or you do not have permission to access it",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 5: Return successful response with note details
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
    console.error("Unexpected error in GET /api/notes/[id]:", error);

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
 * PATCH /api/notes/{id}
 *
 * Update selected fields of a note
 * Only owner can update. All fields are optional, but at least one must be provided.
 *
 * Updatable fields:
 * - summary_text (can be set to null)
 * - goal_status
 * - meeting_date
 * - tag_id (new tag must be owned by user)
 *
 * Note: original_content is immutable and cannot be updated
 *
 * @param params.id - Note ID (UUID)
 * @param request.body - Fields to update
 * @returns 200 - Updated note
 * @returns 400 - Invalid request (no fields, invalid UUID, validation errors)
 * @returns 401 - Missing or invalid authentication token
 * @returns 403 - Not owner or tag not owned by user
 * @returns 404 - Note not found
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
    const validationResult = updateNoteSchema.safeParse(body);

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

    const validatedInput: UpdateNoteInput = validationResult.data;

    // Step 5: Update note via service
    const notesService = new NotesService(locals.supabase);
    let result: NoteDTO;

    try {
      result = await notesService.updateNote(userId, noteId, validatedInput);
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
            details: "You do not have permission to update this note",
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (errorMessage === "TAG_NOT_OWNED") {
        return new Response(
          JSON.stringify({
            error: "Forbidden",
            message: "Tag access denied",
            details: "The specified tag does not exist or you do not have permission to use it",
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Generic service error
      // eslint-disable-next-line no-console
      console.error("NotesService.updateNote error:", {
        userId,
        noteId,
        error: errorMessage,
      });

      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: "Failed to update note",
          details: errorMessage,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 6: Return 200 OK with updated note
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
    console.error("Unexpected error in PATCH /api/notes/[id]:", error);

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
 * DELETE /api/notes/{id}
 *
 * Delete a note by ID
 * Only owner can delete. Related records (public_links) are deleted via CASCADE.
 *
 * @param params.id - Note ID (UUID)
 * @returns 204 - No Content (successful deletion)
 * @returns 400 - Invalid UUID format
 * @returns 401 - Missing or invalid authentication token
 * @returns 404 - Note not found or access denied (don't reveal existence)
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

    // Step 3: Delete note via service
    const notesService = new NotesService(locals.supabase);

    try {
      await notesService.deleteNote(userId, noteId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Handle specific error cases - both NOT_FOUND and NOT_OWNED return 404
      // Security: Don't reveal whether note exists if user doesn't own it
      if (errorMessage === "NOTE_NOT_FOUND" || errorMessage === "NOTE_NOT_OWNED") {
        return new Response(
          JSON.stringify({
            error: "Not found",
            message: "Note not found",
            details: "The requested note does not exist or you do not have permission to delete it",
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Generic service error
      // eslint-disable-next-line no-console
      console.error("NotesService.deleteNote error:", {
        userId,
        noteId,
        error: errorMessage,
      });

      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: "Failed to delete note",
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
    console.error("Unexpected error in DELETE /api/notes/[id]:", error);

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
