import { requireAuth } from "../../../lib/middleware/auth.middleware";
import { NotesService } from "../../../lib/services/notes.service";
import { uuidSchema } from "../../../lib/validators/shared.schemas";
import type { NoteDetailDTO } from "../../../types";
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
